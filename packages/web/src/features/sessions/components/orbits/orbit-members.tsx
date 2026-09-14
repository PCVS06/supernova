import {useState} from "react";
import Button from "@/components/ui/button";
import type {OrbitBody, OrbitModel} from "@/features/sessions/lib/orbits/orbit-model";

const PAGE_SIZE = 12;

/** A bounded, searchable route to every member, including deeply nested and completed work. */
export default function OrbitMembers(props: {model: OrbitModel; ids: readonly string[]; onSelect: (body: OrbitBody) => void; onClose: () => void}) {
  const {model, ids, onSelect, onClose} = props;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const all = new Set<string>(),
    pending = [...ids];
  while (pending.length) {
    const id = pending.pop()!;
    if (all.has(id)) continue;
    all.add(id);
    pending.push(...(model.children.get(id) ?? []));
  }
  const query = search.trim().toLowerCase();
  const members = [...all]
    .map((id) => model.bodies.get(id))
    .filter((body): body is OrbitBody => Boolean(body))
    .filter((body) => !query || `${body.label} ${body.detail} ${body.status}`.toLowerCase().includes(query));
  const current = Math.min(page, Math.max(0, Math.ceil(members.length / PAGE_SIZE) - 1));
  return (
    <section className="chat-orbit-members" aria-label="Orbit participants">
      <div className="flex items-center gap-3">
        <input
          aria-label="Find a participant"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
          placeholder="Find a participant"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
        <Button onClick={onClose} aria-label="Close participants">
          ×
        </Button>
      </div>
      <ul className="my-2" aria-label="Matching participants">
        {members.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((body) => (
          <li key={body.id}>
            <Button className="flex w-full items-start justify-between gap-4 py-2 text-left text-xs" onClick={() => onSelect(body)}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{body.label}</span>
                <span className="block truncate text-ink-faint">{model.bodies.get(body.parentId ?? "")?.label}</span>
              </span>
              <span className="shrink-0 text-ink-muted">{body.status}</span>
            </Button>
          </li>
        ))}
      </ul>
      {!members.length && <p className="py-3 text-xs text-ink-muted">No matching participants.</p>}
      <div className="flex items-center gap-4 text-xs text-ink-muted">
        <Button disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous participants">
          ←
        </Button>
        <span role="status">{members.length ? `${current * PAGE_SIZE + 1}–${Math.min(members.length, (current + 1) * PAGE_SIZE)} of ${members.length}` : "0 participants"}</span>
        <Button disabled={(current + 1) * PAGE_SIZE >= members.length} onClick={() => setPage(current + 1)} aria-label="Next participants">
          →
        </Button>
      </div>
    </section>
  );
}
