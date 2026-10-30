import { vi } from 'vitest';

// Use vi.hoisted() so mock fixtures are evaluated before vi.mock() is hoisted
const mocks = vi.hoisted(() => {
  const easy = {
    title: "The Locked Study Mystery",
    story: "A fierce thunderstorm raged outside Blackwood Manor as the grandfather clock struck midnight, marking the demise of Lord Harrington in his locked study.",
    suspects: [
      { id: "suspect_1", name: "Arthur Vance", description: "The long-serving loyal family butler", alibi: "Preparing evening tea in the basement pantry" },
      { id: "suspect_2", name: "Beatrice Lowe", description: "The ambitious estranged niece", alibi: "Reading historical novels alone in the quiet library" },
      { id: "suspect_3", name: "Charles Pike", description: "The visiting personal physician", alibi: "Walking outdoors through the rainy rose garden" },
    ],
    clues: [
      { id: "clue_1", text: "A broken porcelain teacup was discovered shattered near the fireplace hearth." },
      { id: "clue_2", text: "Muddy leather boots were concealed behind the conservatory radiator." },
      { id: "clue_3", text: "Traces of lethal digitalis were detected inside the antique teaspoon residue." },
      { id: "clue_4", text: "A hidden ledger reveals exorbitant gambling debts overdue before dawn." },
      { id: "clue_5", text: "The physician's medicine bag shows a freshly torn strap matching threads on the window latch." },
    ],
    hints: [
      { id: "hint_1", text: "Examine who among the guests had professional access to lethal prescription alkaloids." },
      { id: "hint_2", text: "Review physical fabric evidence recovered from the study window latch." },
    ],
    solution: {
      culpritId: "suspect_3",
      explanation: "Dr. Charles Pike poisoned the tea with digitalis as confirmed by clue_3 and escaped out the window leaving torn threads from his medical bag as proven by clue_5.",
    },
  };

  const medium = {
    title: "The Gallery Heist Homicide",
    story: "During the prestigious annual gala at the Grand Horizon Museum, the master curator was found murdered inside the high-security vault shortly after midnight.",
    suspects: [
      { id: "suspect_1", name: "Marcus Shaw", description: "The disgruntled former chief of museum security", alibi: "Monitoring the perimeter cameras in the outer lobby" },
      { id: "suspect_2", name: "Elena Rostova", description: "The renowned private international art dealer", alibi: "Speaking with wealthy prospective patrons near the champagne fountain" },
      { id: "suspect_3", name: "Julian Thorne", description: "The senior restorations specialist on duty", alibi: "Restoring eighteenth-century oil paintings in the upper workshop" },
      { id: "suspect_4", name: "Clara Bennett", description: "The executive museum board trustee", alibi: "Reviewing quarterly financial statements in the boardroom" },
    ],
    clues: [
      { id: "clue_1", text: "The keypad log indicates the vault was bypassed using a supervisor override card." },
      { id: "clue_2", text: "A rare synthetic solvent was discovered smeared across the curator's velvet coat." },
      { id: "clue_3", text: "Fiber analysis reveals silk scarf strands caught inside the vault lock mechanism." },
      { id: "clue_4", text: "Security footage shows a masked silhouette entering the restoration studio at 11:45 PM." },
      { id: "clue_5", text: "A courier invoice for synthetic restoration solvents was found hidden in the desk." },
      { id: "clue_6", text: "Bank transfers show recent unexplained deposits into an offshore bank account." },
      { id: "clue_7", text: "The emergency alarm sensor wire was severed with surgical precision shears." },
    ],
    hints: [
      { id: "hint_1", text: "Consider which suspect possessed specialized restoration chemistry supplies." },
      { id: "hint_2", text: "Inspect who was physically present in the upper restoration wing before midnight." },
      { id: "hint_3", text: "Cross-examine the chemical evidence on the curator's velvet coat." },
    ],
    solution: {
      culpritId: "suspect_3",
      explanation: "Julian Thorne used his restoration studio access as proven by clue_4 and poisoned the curator with synthetic solvents as verified by clue_2.",
    },
  };

  const hard = {
    title: "The Midnight Express Poisoning",
    story: "As the luxury express train raced through the alpine mountain pass, billionaire venture capitalist Victor Drake collapsed dead in his first-class private cabin.",
    suspects: [
      { id: "suspect_1", name: "Dominic West", description: "The embattled personal financial consultant", alibi: "Drinking solitary scotch in the dining car saloon" },
      { id: "suspect_2", name: "Helena Vance", description: "The investigative financial journalist", alibi: "Interviewing train staff regarding passenger manifests" },
      { id: "suspect_3", name: "Dmitri Volkov", description: "The rival biotechnology enterprise magnate", alibi: "Resting inside his adjoining first-class sleeping compartment" },
      { id: "suspect_4", name: "Sophia Reynolds", description: "The veteran private flight surgeon", alibi: "Administering motion sickness medicine in the second-class lounge" },
      { id: "suspect_5", name: "Gideon Cross", description: "The chief private train security officer", alibi: "Patrolling the baggage car compartments during the storm" },
    ],
    clues: [
      { id: "clue_1", text: "A broken glass ampoule emitting bitter almond scent was found under the luggage rack." },
      { id: "clue_2", text: "A conductor master pass was used to unlock the connecting door at 11:42 PM." },
      { id: "clue_3", text: "Cyanide residue was detected inside the deceased's vintage fountain pen." },
      { id: "clue_4", text: "A forged passenger ticket was discovered discarded inside the baggage car." },
      { id: "clue_5", text: "Lab records reveal secret patent theft charges against a rival biotech firm." },
      { id: "clue_6", text: "CCTV captures a tailored overcoat entering Victor's compartment at 11:40 PM." },
      { id: "clue_7", text: "The security logs for the dining car show deliberate tampering with timestamps." },
      { id: "clue_8", text: "A duplicate keycard was discovered inside the adjoining room's vent." },
      { id: "clue_9", text: "Medical gloves with cyanide traces were recovered from the train lavatory trash." },
    ],
    hints: [
      { id: "hint_1", text: "Examine who had motives involving patent theft and biochemical capability." },
      { id: "hint_2", text: "Connect the master pass usage with the passenger occupying the adjoining room." },
      { id: "hint_3", text: "Correlate the fountain pen cyanide residue with the recovered medical gloves." },
    ],
    solution: {
      culpritId: "suspect_3",
      explanation: "Dmitri Volkov used the connecting door master pass as revealed by clue_2 and planted cyanide in the pen as established by clue_3.",
    },
  };

  return { mockEasyMystery: easy, mockMediumMystery: medium, mockHardMystery: hard };
});

vi.mock('../src/services/geminiService.js', () => ({
  generateMystery: vi.fn().mockImplementation((prompt, difficulty) => {
    if (difficulty === 'medium') return Promise.resolve(mocks.mockMediumMystery);
    if (difficulty === 'hard') return Promise.resolve(mocks.mockHardMystery);
    return Promise.resolve(mocks.mockEasyMystery);
  }),
}));

export const mockEasyMystery = mocks.mockEasyMystery;
export const mockMediumMystery = mocks.mockMediumMystery;
export const mockHardMystery = mocks.mockHardMystery;

