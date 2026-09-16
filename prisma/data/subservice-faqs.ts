// Questions written for a job, which replace the generated four.
//
// Every subservice page carries four questions built from its own name, which
// is better than an empty section and worse than a real answer: the same four
// on every page with one word swapped. A written set replaces them entirely
// rather than joining them, because a page that answers two things properly
// beats one that answers six vaguely.
//
// Sparse on purpose. A job only belongs here when the generated questions are
// actually wrong for it, or when the honest answer is specific enough to be
// worth reading. Keyed by category slug, then subservice slug.

export const SUBSERVICE_FAQS: Record<string, Record<string, { question: string; answer: string }[]>> = {
  flooring: {
    hardwood: [
      {
        question: "Who handles hardwood flooring?",
        answer:
          "Flooring companies, and within that a mix of firms that install with their own crews and firms that list the service and subcontract it. The first question worth asking is which of the two you are speaking to, because it decides who is answerable if the floor has to come back up.",
      },
      {
        question: "What should I ask before booking hardwood flooring?",
        answer:
          "Two questions specific to wood: how many days the material will acclimate in the room before it is fitted, and what flatness tolerance the manufacturer specifies for the subfloor and whether it was checked against it. Then the general set: licence for the parent trade, insurance confirmed with the insurer, and the exclusions in writing.",
      },
      {
        question: "How do I compare quotes for this?",
        answer:
          "Line the exclusions up, not the totals. Removal and disposal of the old floor, levelling or subfloor replacement, permits and making good afterwards are the items that move a price by thousands, and a low quote usually means one of them sits outside the number.",
      },
      {
        question: "Is hardwood flooring priced separately from the rest of the job?",
        answer:
          "Usually yes, priced per square foot installed, with removal, levelling and subfloor repair added as separate lines. If hardwood is part of a larger remodel, ask for it as its own figure so you can compare it against a flooring specialist's quote.",
      },
    ],
  },
};
