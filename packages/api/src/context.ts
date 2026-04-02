export async function createContext() {
  return {
    // Cast to any to allow the protectedProcedure to safely narrow the type
    // while satisfying initial null state requirements.
    session: null as any,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
