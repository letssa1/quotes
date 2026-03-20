// ======================================================
// QuoteGenerator.jsx — Full CRUD
// Tailwind CSS · React
// Three views: Generator · All Quotes · Add Quote
// Connects to Express API (server.js). Falls back offline.
// ======================================================

import { useState, useEffect, useCallback } from "react";

// =========================
// CONSTANTS
// =========================

// Express API base URL — must match server.js PORT
const API_URL = "http://localhost:3000";

// Shown when the API is offline
const FALLBACK_QUOTES = [
    { quote: "The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.", author: "Albert Camus" },
    { quote: "My mission, should I choose to accept it, is to find peace with exactly who and what I am. To take pride in my thoughts, my appearance, my talents, my flaws and to stop this incessant worrying that I can’t be loved as I am.", author: "Anais Nin" },
    { quote: "Movement and change are the essence of our being; rigidity is death; conformity is death; let us say what comes into our heads, repeat ourselves, contradict ourselves, fling out the wildest nonsense, and follow the most fantastic fancies without caring what the world does or thinks or says. For nothing matters except life.", author: "Virginia Woolf" },
    { quote: "I have dreamed in my life, dreams that have stayed with me ever after, and changed my ideas; they have gone through and through me, like wine through water, and altered the color of my mind.", author: "Emily Bronte" },
    { quote: "The human heart has hidden treasures, In secret kept, in silence sealed; The thoughts, the hopes, the dreams, the pleasures, Whose charms were broken if revealed.", author: "Charlotte Bronte" },
];

// Tab identifiers
const TABS = {
    GENERATOR: "generator",
    ALL:       "all",
    ADD:       "add",
};

// Returns a random element from an array
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];


// =========================
// MAIN COMPONENT
// =========================

export default function QuoteGenerator() {

    // Active tab
    const [tab, setTab] = useState(TABS.GENERATOR);

    // Full list of quotes (from API or fallback)
    const [quotes, setQuotes] = useState([]);

    // Quote shown in the Generator tab
    const [current, setCurrent] = useState(null);

    // True while the initial fetch is running
    const [loading, setLoading] = useState(true);

    // Whether the Express server responded successfully
    const [apiOnline, setApiOnline] = useState(false);

    // Drives the fade animation between quote swaps
    const [visible, setVisible] = useState(true);

    // "Copied!" flash — resets after 2s
    const [copied, setCopied] = useState(false);

    // Add Quote form fields
    const [form, setForm] = useState({ quote: "", author: "" });

    // Feedback shown after form submission: { type, text } | null
    const [formMsg, setFormMsg] = useState(null);

    // _id of the quote currently being deleted (shows feedback on that row)
    const [deletingId, setDeletingId] = useState(null);

    // True while POST /quotes is in flight
    const [submitting, setSubmitting] = useState(false);


    // -------------------------------------------------
    // loadQuotes — fetches all quotes from the API
    // Falls back to FALLBACK_QUOTES on any error
    // -------------------------------------------------
    const loadQuotes = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/quotes`, {
                signal: AbortSignal.timeout(3000),
            });
            if (!res.ok) throw new Error("Bad response");

            const data = await res.json();

            setQuotes(data);
            setApiOnline(true);
            setCurrent(data.length > 0 ? pickRandom(data) : null);
        } catch {
            setApiOnline(false);
            setQuotes(FALLBACK_QUOTES);
            setCurrent(pickRandom(FALLBACK_QUOTES));
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => { void loadQuotes(); }, [loadQuotes]);


    // -------------------------------------------------
    // handleNewQuote — fades out, swaps quote, fades in
    // -------------------------------------------------
    const handleNewQuote = useCallback(() => {
        setVisible(false);
        setTimeout(() => {
            setCurrent(pickRandom(quotes.length > 0 ? quotes : FALLBACK_QUOTES));
            setVisible(true);
        }, 300);
    }, [quotes]);


    // -------------------------------------------------
    // handleCopy — writes quote + author to clipboard
    // -------------------------------------------------
    const handleCopy = useCallback(() => {
        if (!current) return;
        navigator.clipboard
            .writeText(`"${current.quote}" — ${current.author}`)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => alert("Clipboard access denied."));
    }, [current]);


    // -------------------------------------------------
    // handleDelete — DELETE /quotes/:id
    // Removes the quote from local state immediately
    // -------------------------------------------------
    const handleDelete = useCallback(async (id) => {
        setDeletingId(id);
        try {
            const res = await fetch(`${API_URL}/quotes/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");

            // Optimistic update — remove from list without re-fetching
            setQuotes((prev) => prev.filter((q) => q._id !== id));

            // If the deleted quote is on screen, pick another
            if (current?._id === id) {
                const remaining = quotes.filter((q) => q._id !== id);
                setCurrent(remaining.length > 0 ? pickRandom(remaining) : null);
            }
        } catch {
            alert("Could not delete. Is the server running?");
        } finally {
            setDeletingId(null);
        }
    }, [current, quotes]);


    // -------------------------------------------------
    // handleAdd — POST /quotes with form data
    // -------------------------------------------------
    const handleAdd = useCallback(async () => {
        // Client-side validation mirrors server validation
        if (!form.quote.trim() || !form.author.trim()) {
            setFormMsg({ type: "error", text: "Both fields are required." });
            return;
        }

        setSubmitting(true);
        setFormMsg(null);

        try {
            const res = await fetch(`${API_URL}/quotes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quote: form.quote.trim(), author: form.author.trim() }),
            });

            if (!res.ok) throw new Error("Server rejected");

            const { data: newQuote } = await res.json();

            // Append to list without re-fetching
            setQuotes((prev) => [...prev, newQuote]);
            setForm({ quote: "", author: "" });
            setFormMsg({ type: "success", text: "Quote added!" });
            setTimeout(() => setFormMsg(null), 3000);
        } catch {
            setFormMsg({ type: "error", text: "Failed to add. Is the server running?" });
        } finally {
            setSubmitting(false);
        }
    }, [form]);


    // =========================
    // TAB BAR
    // =========================

    const TabBar = () => (
        <div className="flex border-b border-stone-100 mb-8">
            {[
                { id: TABS.GENERATOR, label: "Generator" },
                { id: TABS.ALL,       label: `All Quotes${quotes.length > 0 ? ` (${quotes.length})` : ""}` },
                { id: TABS.ADD,       label: "Add Quote" },
            ].map(({ id, label }) => (
                <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`
            pb-3 mr-6 text-sm font-medium tracking-wide transition-colors duration-150
            border-b-2 -mb-px cursor-pointer
            ${tab === id
                        ? "border-stone-800 text-stone-800"
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    }
          `}
                >
                    {label}
                </button>
            ))}
        </div>
    );


    // =========================
    // GENERATOR VIEW
    // =========================

    const GeneratorView = () => (
        <div className="flex flex-col gap-8">

            {/* Quote body — fades on swap */}
            <div
                className="flex flex-col gap-4 transition-opacity duration-300 min-h-40"
                style={{ opacity: visible ? 1 : 0 }}
            >
                {/* Decorative opening quote mark */}
                <span className="text-5xl leading-none text-stone-200 select-none font-serif">&ldquo;</span>

                {/* Quote text */}
                <p className="text-xl leading-relaxed text-stone-700 font-serif italic">
                    {loading ? "Loading…" : current?.quote ?? "No quotes yet — add one!"}
                </p>

                {/* Author */}
                <p className="text-sm tracking-wider uppercase text-stone-400 font-medium">
                    {!loading && current?.author ? `— ${current.author}` : ""}
                </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleNewQuote}
                    disabled={loading || quotes.length === 0}
                    className="flex-1 bg-stone-800 hover:bg-stone-700 active:scale-95 disabled:opacity-40
                     text-white text-sm tracking-wide font-medium rounded-xl py-3
                     transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                >
                    New Quote
                </button>

                <button
                    onClick={handleCopy}
                    disabled={loading || !current}
                    className="px-5 border border-stone-200 hover:border-stone-400 hover:text-stone-700
                     active:scale-95 disabled:opacity-40 text-stone-400 text-sm tracking-wide
                     font-medium rounded-xl py-3 transition-all duration-150
                     cursor-pointer disabled:cursor-not-allowed"
                >
                    {copied ? "Copied ✓" : "Copy"}
                </button>
            </div>

        </div>
    );


    // =========================
    // ALL QUOTES VIEW
    // =========================

    const AllQuotesView = () => (
        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">

            {/* Empty state */}
            {quotes.length === 0 && (
                <p className="text-stone-400 text-sm text-center py-8">
                    No quotes yet. Add one using the <strong>Add Quote</strong> tab.
                </p>
            )}

            {/* Quote rows */}
            {quotes.map((q, i) => (
                <div
                    key={q._id ?? i}
                    className="flex items-start justify-between gap-4 p-4 rounded-xl
                     border border-stone-100 hover:border-stone-200 transition-colors group"
                >
                    {/* Text + author */}
                    <div className="flex flex-col gap-1 min-w-0">
                        <p className="text-stone-700 text-sm leading-relaxed font-serif italic">
                            &ldquo;{q.quote}&rdquo;
                        </p>
                        <p className="text-xs text-stone-400 tracking-wide uppercase">{q.author}</p>
                    </div>

                    {/* Delete — only available when API is online */}
                    {apiOnline && (
                        <button
                            onClick={() => handleDelete(q._id)}
                            disabled={deletingId === q._id}
                            className="shrink-0 text-stone-300 hover:text-red-400 active:scale-95
                         disabled:opacity-40 text-xs font-medium tracking-wide
                         transition-all duration-150 cursor-pointer disabled:cursor-not-allowed
                         opacity-0 group-hover:opacity-100"
                        >
                            {deletingId === q._id ? "…" : "Delete"}
                        </button>
                    )}
                </div>
            ))}

        </div>
    );


    // =========================
    // ADD QUOTE VIEW
    // =========================

    const AddQuoteView = () => (
        <div className="flex flex-col gap-6">

            {/* Quote textarea */}
            <div className="flex flex-col gap-2">
                <label className="text-xs tracking-widest uppercase text-stone-400 font-medium">
                    Quote
                </label>
                <textarea
                    value={form.quote}
                    onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({ ...f, quote: val }));
                    }}
                    placeholder="Enter the quote…"
                    rows={4}
                    className="border border-stone-200 focus:border-stone-400 focus:outline-none
                     rounded-xl px-4 py-3 text-sm text-stone-700 font-serif italic
                     placeholder:text-stone-300 resize-none transition-colors duration-150"
                />
            </div>

            {/* Author input */}
            <div className="flex flex-col gap-2">
                <label className="text-xs tracking-widest uppercase text-stone-400 font-medium">
                    Author
                </label>
                <input
                    type="text"
                    value={form.author}
                    onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({ ...f, author: val }));
                    }}
                    placeholder="Who said it?"
                    className="border border-stone-200 focus:border-stone-400 focus:outline-none
                     rounded-xl px-4 py-3 text-sm text-stone-700
                     placeholder:text-stone-300 transition-colors duration-150"
                />
            </div>

            {/* Success / error message */}
            {formMsg && (
                <p className={`text-sm font-medium ${
                    formMsg.type === "success" ? "text-emerald-500" : "text-red-400"
                }`}>
                    {formMsg.text}
                </p>
            )}

            {/* Submit */}
            <button
                onClick={handleAdd}
                disabled={submitting || !apiOnline}
                className="bg-stone-800 hover:bg-stone-700 active:scale-95 disabled:opacity-40
                   text-white text-sm tracking-wide font-medium rounded-xl py-3
                   transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
            >
                {submitting ? "Adding…" : !apiOnline ? "API Offline" : "Add Quote"}
            </button>

            {/* Offline nudge */}
            {!apiOnline && (
                <p className="text-xs text-stone-400 text-center">
                    Start your Express server to add quotes.
                </p>
            )}

        </div>
    );


    // =========================
    // ROOT RENDER
    // =========================

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 max-w-xl w-full px-10 py-10 flex flex-col">

                {/* Header: title + API status */}
                <div className="flex items-center justify-between mb-8">
          <span className="text-xs tracking-widest uppercase text-stone-400 font-medium">
            Quote Generator
          </span>
                    <span
                        className={`text-xs tracking-wide flex items-center gap-1.5 ${
                            apiOnline ? "text-emerald-500" : "text-amber-400"
                        }`}
                        title={apiOnline ? `Connected to ${API_URL}` : "Using built-in quotes"}
                    >
            <span className={`w-1.5 h-1.5 rounded-full ${apiOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
                        {apiOnline ? "Live" : "Offline"}
          </span>
                </div>

                {/* Tabs */}
                <TabBar />

                {/* Active view */}
                {tab === TABS.GENERATOR && <GeneratorView />}
                {tab === TABS.ALL       && <AllQuotesView />}
                {tab === TABS.ADD       && <AddQuoteView />}

            </div>
        </div>
    );
}