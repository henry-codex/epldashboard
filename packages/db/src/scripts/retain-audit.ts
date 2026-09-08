import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({path:fileURLToPath(new URL("../../../../apps/server/.env",import.meta.url)),quiet:true});
async function main(){
  const args=process.argv.slice(2),operator=args[args.indexOf("--operator")+1];
  if(!args.includes("--operator")||!operator||operator.startsWith("--"))throw new Error("Supply --operator ID; default is a dry run. Add --apply to remove expired entries.");
  const {transactionalDb}=await import("../index");
  const {retainAudit}=await import("../audit-retention");
  console.info(await retainAudit(transactionalDb,{operator,apply:args.includes("--apply")}));
}
main().then(()=>process.exit(0)).catch(error=>{
  console.error(error instanceof Error&&error.message.startsWith("Supply ")?error.message:"Audit retention failed; no cleanup was committed.");
  process.exit(1);
});
