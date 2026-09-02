import { lessons } from "@/lib/constants";

export default function LearningPage() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {lessons.map((lesson) => (
        <article
          key={lesson.id}
          className="rounded-lg border border-virada-line bg-white p-5 shadow-card"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-virada-gold">
            Lição curta
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-900">{lesson.title}</h2>
          <p className="mt-4 text-sm leading-7 text-virada-gray">{lesson.text}</p>
          <div className="mt-5 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">
              Ação prática
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-900">{lesson.action}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
