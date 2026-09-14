import {SettingsGroup} from "@/features/settings/components/settings-group";
import ConfigCard from "@/features/harnesses/components/config-card";
import {useCuration} from "@/features/harnesses/hooks/api/use-curation";
import {compactChars, relativeTime, spendLabel} from "@/features/harnesses/lib/curation-format";

const REVIEW_LIMIT = 20;

interface CuratorReviewListProps {
  harnessId: string;
}

/** What the curator reviewed and what it cost, newest first. A record of work, so it belongs beside the proposals. */
export default function CuratorReviewList(props: CuratorReviewListProps) {
  const {harnessId} = props;
  const curation = useCuration(harnessId);
  const reviews = (curation.data?.reviews ?? []).toSorted((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, REVIEW_LIMIT);

  return (
    <SettingsGroup title="Reviews">
      <div className="space-y-2 px-3 sm:px-4">
        {reviews.map((review) => (
          <ConfigCard key={review.id} className="space-y-1 p-3">
            <p className="text-xs text-ink-muted">
              {relativeTime(review.startedAt)} · {review.trigger} · {review.status} · {review.proposals} proposals · {review.applied} applied
              {spendLabel(review.spentUsd) && ` · ${spendLabel(review.spentUsd)}`}
              {review.instructionChars !== undefined && ` · ${compactChars(review.instructionChars)} chars`}
            </p>
            {review.status === "failed" && (
              <p className="truncate text-xs text-danger-ink" title={review.error ?? undefined}>
                {review.error ?? "No reason given."}
              </p>
            )}
          </ConfigCard>
        ))}
        {!reviews.length && <ConfigCard className="text-sm text-ink-muted">No reviews yet.</ConfigCard>}
      </div>
    </SettingsGroup>
  );
}
