import { useState, useCallback } from "react";
import { ArrowLeft, Brain, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Question = { q: string; options: string[]; answer: string };

const quizBank: Record<string, Question[]> = {
  general: [
    { q: "What is the capital of Uganda?", options: ["Kampala", "Nairobi", "Kigali", "Dar es Salaam"], answer: "Kampala" },
    { q: "What does H₂O stand for?", options: ["Water", "Oxygen", "Hydrogen", "Carbon dioxide"], answer: "Water" },
    { q: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], answer: "Mars" },
    { q: "How many continents are there?", options: ["5", "6", "7", "8"], answer: "7" },
    { q: "What is the largest ocean?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], answer: "Pacific" },
  ],
  math: [
    { q: "What is 15 × 12?", options: ["170", "180", "190", "200"], answer: "180" },
    { q: "What is the square root of 144?", options: ["10", "11", "12", "13"], answer: "12" },
    { q: "What is 2⁵?", options: ["16", "32", "64", "128"], answer: "32" },
    { q: "What is the value of π (approx)?", options: ["3.12", "3.14", "3.16", "3.18"], answer: "3.14" },
    { q: "What is 7! (7 factorial)?", options: ["720", "5040", "2520", "40320"], answer: "5040" },
  ],
  biology: [
    { q: "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"], answer: "Mitochondria" },
    { q: "What gas do plants absorb?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answer: "Carbon dioxide" },
    { q: "DNA stands for?", options: ["Deoxyribonucleic acid", "Dinitrogen acid", "Deoxynitric acid", "None of these"], answer: "Deoxyribonucleic acid" },
    { q: "Which blood type is the universal donor?", options: ["A", "B", "AB", "O"], answer: "O" },
    { q: "How many chromosomes do humans have?", options: ["23", "44", "46", "48"], answer: "46" },
  ],
  physics: [
    { q: "What is the SI unit of force?", options: ["Joule", "Newton", "Watt", "Pascal"], answer: "Newton" },
    { q: "Speed of light is approximately?", options: ["3×10⁶ m/s", "3×10⁸ m/s", "3×10¹⁰ m/s", "3×10⁴ m/s"], answer: "3×10⁸ m/s" },
    { q: "What does F = ma represent?", options: ["Energy", "Force", "Power", "Momentum"], answer: "Force" },
    { q: "What is the unit of electrical resistance?", options: ["Volt", "Ampere", "Ohm", "Watt"], answer: "Ohm" },
  ],
  chemistry: [
    { q: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], answer: "Au" },
    { q: "What is the pH of pure water?", options: ["5", "7", "9", "14"], answer: "7" },
    { q: "How many elements are in the periodic table?", options: ["108", "112", "118", "120"], answer: "118" },
    { q: "What gas is produced during photosynthesis?", options: ["CO₂", "O₂", "N₂", "H₂"], answer: "O₂" },
  ],
  history: [
    { q: "When did World War II end?", options: ["1943", "1944", "1945", "1946"], answer: "1945" },
    { q: "Who was the first president of the USA?", options: ["Lincoln", "Washington", "Jefferson", "Adams"], answer: "Washington" },
    { q: "In which year did Uganda gain independence?", options: ["1960", "1962", "1963", "1964"], answer: "1962" },
  ],
  geography: [
    { q: "What is the longest river in Africa?", options: ["Congo", "Niger", "Nile", "Zambezi"], answer: "Nile" },
    { q: "What is the largest desert in the world?", options: ["Sahara", "Gobi", "Antarctic", "Arabian"], answer: "Antarctic" },
    { q: "Mount Kilimanjaro is in which country?", options: ["Kenya", "Tanzania", "Uganda", "Ethiopia"], answer: "Tanzania" },
  ],
};

export default function QuizPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("general");
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const questions = quizBank[subject] || quizBank.general;

  const startQuiz = useCallback(() => {
    setCurrentIdx(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
    setStarted(true);
  }, []);

  const handleAnswer = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    if (opt === questions[currentIdx].answer) setScore((s) => s + 1);

    setTimeout(() => {
      if (currentIdx + 1 >= questions.length) {
        setFinished(true);
      } else {
        setCurrentIdx((i) => i + 1);
        setSelected(null);
      }
    }, 1000);
  };

  const q = questions[currentIdx];

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Brain className="w-5 h-5 text-primary" />
        <h1 className="text-base font-semibold">Quiz Mode</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {!started ? (
          <div className="bg-card rounded-xl border border-border p-6 space-y-4 text-center">
            <Brain className="w-12 h-12 text-primary mx-auto" />
            <h3 className="text-lg font-bold">Test Your Knowledge</h3>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-secondary text-secondary-foreground border-none rounded-md px-3 py-2 text-sm">
              {Object.keys(quizBank).map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button onClick={startQuiz} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Start Quiz
            </button>
          </div>
        ) : finished ? (
          <div className="bg-card rounded-xl border border-border p-6 space-y-4 text-center">
            <h3 className="text-lg font-bold">Quiz Complete! 🎉</h3>
            <p className="text-3xl font-bold text-primary">{score}/{questions.length}</p>
            <p className="text-muted-foreground text-sm">
              {score === questions.length ? "Perfect score!" : score >= questions.length / 2 ? "Good job!" : "Keep practicing!"}
            </p>
            <button onClick={startQuiz} className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Question {currentIdx + 1}/{questions.length}</span>
              <span>Score: {score}</span>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="font-medium text-base">{q.q}</p>
            </div>
            <div className="space-y-2">
              {q.options.map((opt) => {
                let cls = "bg-secondary hover:bg-secondary/80 border-border";
                if (selected) {
                  if (opt === q.answer) cls = "bg-green-600/20 border-green-500 text-green-400";
                  else if (opt === selected) cls = "bg-red-600/20 border-red-500 text-red-400";
                }
                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!selected}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-between ${cls}`}
                  >
                    {opt}
                    {selected && opt === q.answer && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {selected && opt === selected && opt !== q.answer && <XCircle className="w-4 h-4 text-red-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
