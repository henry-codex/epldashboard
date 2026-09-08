import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const mocks=vi.hoisted(()=>({refetch:vi.fn(),options:vi.fn(),pending:false,error:null as null|{message:string;data:{code:string}},items:[] as object[],selected:null as object|null}));
vi.mock("@/utils/trpc",()=>({trpc:{audit:{
  list:{queryOptions:(input:unknown)=>{mocks.options(input);return {kind:"list"};}},
  filters:{queryOptions:()=>({kind:"filters"})},get:{queryOptions:()=>({kind:"get"})}
}}}));
vi.mock("@tanstack/react-query",()=>({useQuery:({kind}:{kind:string})=>({isPending:mocks.pending,isError:!!mocks.error,error:mocks.error,isFetching:false,refetch:mocks.refetch,
  data:kind==="list"?{items:mocks.items,nextCursor:null}:kind==="get"?mocks.selected:{hubs:[],actors:[],actions:[],categories:[],targetTypes:[]}})}));
vi.mock("./slide-panel",()=>({SlidePanel:({open,children}:{open:boolean;children:ReactNode})=>open?<div role="dialog">{children}</div>:null}));
import { AuditLog } from "./audit-log";
beforeEach(()=>{mocks.pending=false;mocks.error=null;mocks.items=[];mocks.selected=null;vi.clearAllMocks();});
afterEach(cleanup);
describe("audit interface",()=>{
  it("shows loading and searchable empty results",()=>{
    mocks.pending=true;const view=render(<AuditLog/>);expect(screen.getByText("Loading audit events…")).toBeTruthy();
    mocks.pending=false;view.rerender(<AuditLog/>);expect(screen.getByText("No audit events found")).toBeTruthy();
    expect(screen.getByLabelText("Search actor or record")).toBeTruthy();
  });
  it("applies search filters explicitly and resets pagination",()=>{
    render(<AuditLog/>);fireEvent.change(screen.getByLabelText("Search actor or record"),{target:{value:"Ama"}});
    fireEvent.click(screen.getByRole("button",{name:"Apply filters"}));
    expect(mocks.options).toHaveBeenLastCalledWith(expect.objectContaining({search:"Ama",cursor:undefined,limit:50}));
  });
  it.each(["UNAUTHORIZED","FORBIDDEN"])("hides cached events after %s",code=>{
    mocks.items=[{id:"private-event",actor:{name:"Private Actor"},action:"secret"}];mocks.error={message:"Rejected",data:{code}};
    render(<AuditLog/>);expect(screen.queryByText("Private Actor")).toBeNull();expect(screen.getByRole("button",{name:"Try again"})).toBeTruthy();
  });
  it("shows safe changes and unavailable metadata in accessible event details",()=>{
    const row={id:"1",action:"membership.role_changed",outcome:"success",actor:{kind:"user",name:"Ama",id:"actor",role:"super_admin"},targetType:"membership",targetLabel:"Member",targetId:"member",
      tenantName:"Ghana",occurredAt:"2026-09-07T12:00:00Z",changes:[{field:"role",before:"viewer",after:"country_admin"},{field:"phone",redacted:true}],details:{},source:"web",requestId:"request"};
    mocks.items=[row];mocks.selected=row;render(<AuditLog/>);
    fireEvent.click(screen.getByRole("button",{name:"View Membership role changed details"}));
    expect(screen.getByRole("dialog")).toBeTruthy();expect(screen.getByText("Changed · values withheld")).toBeTruthy();expect(screen.getByText("viewer")).toBeTruthy();expect(screen.getByText("Unknown browser or device")).toBeTruthy();
  });
});
