/** Definition card for the glossary grid. */
function GlossaryCard({ term, body }: { term: string; body: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-6">
      <h3 className="text-lg font-semibold text-brand">{term}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

export { GlossaryCard };
export default GlossaryCard;
