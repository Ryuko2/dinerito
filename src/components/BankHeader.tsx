export default function BankHeader() {
  const year = new Date().getFullYear();
  return (
    <div className="bank-header-frame rounded-lg px-4 py-2.5 bg-[#F5ECD7]/90">
      <div className="flex items-center justify-center gap-2">
        <span className="text-copper text-xl" aria-hidden>★</span>
        <div className="text-center">
          <h1 className="font-serif font-bold text-lg tracking-[0.2em] uppercase text-copper" style={{ fontFamily: "'Playfair Display', serif" }}>
            First Bank of the West
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-widest">Est. {year}</p>
        </div>
        <span className="text-copper text-xl" aria-hidden>★</span>
      </div>
    </div>
  );
}
