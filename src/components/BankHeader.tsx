export default function BankHeader() {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-copper text-lg" aria-hidden>🤠</span>
      <h1
        className="font-bold text-copper tracking-wide text-lg"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Dinerito
      </h1>
    </div>
  );
}
