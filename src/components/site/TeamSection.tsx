import { parseList } from "@/lib/json";

// The people at a company, when the company has told us who they are.
//
// Everything here comes from the company: its own website, or an editor typing
// what the company supplied. None of it is verified the way a licence is, and
// the section says so once rather than hedging on every line.

export type TeamMember = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  photoUrl: string | null;
  credentials: string | null;
  yearsExperience: number | null;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function TeamSection({ members }: { members: TeamMember[] }) {
  if (members.length === 0) return null;

  return (
    <ul className="team-grid">
      {members.map((member) => {
        const held = parseList(member.credentials);
        return (
          <li key={member.id} className="team-card">
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="team-card__photo" src={member.photoUrl} alt="" loading="lazy" />
            ) : (
              <span className="team-card__photo team-card__photo--blank" aria-hidden="true">
                {initials(member.name)}
              </span>
            )}
            <div className="team-card__body">
              <p className="team-card__name">{member.name}</p>
              {member.role ? <p className="team-card__role">{member.role}</p> : null}
              {member.yearsExperience ? (
                <p className="team-card__years">{member.yearsExperience} years in the trade</p>
              ) : null}
              {member.bio ? <p className="team-card__bio">{member.bio}</p> : null}
              {held.length > 0 ? (
                <ul className="team-card__creds">
                  {held.map((credential) => (
                    <li key={credential}>{credential}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
