export default function ToolLayout({ icon, title, description, children }) {
  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{icon}</span>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>
        <p className="text-sm text-slate-400 ml-10">{description}</p>
      </div>
      {children}
    </div>
  );
}
