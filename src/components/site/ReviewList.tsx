import { StarIcon } from "@/components/ui/Icon";
import { fullDate } from "@/lib/format";

// Reviews are quoted, never edited and never summarised into a number of our
// own. Each one carries the reviewer's name as Google published it, the date it
// was written and a link back to the original.

export type ShownReview = {
  id: string;
  author: string;
  rating: number;
  body: string;
  postedAt: Date;
  sourceUrl: string | null;
  ownerReply: string | null;
};

/** Trims a long review at a sentence rather than mid-word. */
function excerpt(body: string, limit = 420): string {
  if (body.length <= limit) return body;
  const cut = body.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return `${(stop > limit * 0.55 ? cut.slice(0, stop + 1) : cut).trimEnd()}…`;
}

export function ReviewList({ reviews }: { reviews: ShownReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <ul className="review-list">
      {reviews.map((review) => (
        <li key={review.id} className="review-card">
          <div className="review-card__head">
            <div>
              <p className="review-card__author">{review.author}</p>
              <p className="review-card__date">{fullDate(review.postedAt)}</p>
            </div>
            <span className="review-card__stars" aria-label={`${review.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  size={14}
                  color={star <= Math.round(review.rating) ? "#F4B400" : "var(--border-strong)"}
                />
              ))}
            </span>
          </div>
          <p className="review-card__body">{excerpt(review.body)}</p>
          {review.ownerReply ? (
            <p className="review-card__reply">
              <strong>Reply from the company:</strong> {excerpt(review.ownerReply, 240)}
            </p>
          ) : null}
          {review.sourceUrl ? (
            <a
              className="review-card__link"
              href={review.sourceUrl}
              target="_blank"
              rel="noreferrer nofollow"
            >
              Read it on Google
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
