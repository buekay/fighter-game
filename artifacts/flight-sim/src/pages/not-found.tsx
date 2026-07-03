export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#08080e] text-slate-100 px-4">
      <div className="w-full max-w-md rounded border border-cyan-500/20 bg-slate-950/80 p-6 shadow-[0_0_40px_#00cfff22]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-red-400/40 bg-red-500/10 text-lg font-black text-red-300">
            !
          </div>
          <h1 className="text-2xl font-bold text-white">404 Page Not Found</h1>
        </div>

        <p className="mt-4 text-sm text-slate-400">
          This route is not part of Fighter Command.
        </p>
      </div>
    </div>
  );
}
