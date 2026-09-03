import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Markdown } from "@/components/markdown";

export default async function ParticipantRulesPage() {
  const supabase = await createClient();
  const { data: rules } = await supabase.from("rules").select("*").order("order_index");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Rules</h1>
      <p className="text-slate-500 text-sm mb-6">Please read carefully before you start hacking.</p>

      {(!rules || rules.length === 0) && <p className="text-sm text-slate-400">Rules haven&apos;t been published yet.</p>}

      <div className="space-y-4">
        {rules?.map((r) => (
          <Card key={r.id} className="p-5">
            <h2 className="font-semibold text-slate-900 mb-2">{r.section_title}</h2>
            <Markdown content={r.content} />
          </Card>
        ))}
      </div>
    </div>
  );
}
