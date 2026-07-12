"use client";

import {
  Activity,
  Bot,
  Check,
  Clock3,
  Copy,
  File,
  FileText,
  Image as ImageIcon,
  Download,
  BarChart3,
  GitBranch,
  LayoutDashboard,
  Link2,
  Loader2,
  LockKeyhole,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
  Unplug,
  UserCircle2,
  Workflow,
  X,
  Zap,
  CalendarDays,
  Cloud,
  MessageSquare,
  Mic,
  Plus,
  History,
  LogIn,
  BookOpenText,
  CreditCard,
  Crown,
  Gauge,
  Users,
} from "lucide-react";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Tab =
  | "overview"
  | "chat"
  | "openai"
  | "claude"
  | "composio"
  | "images"
  | "billing"
  | "admin";

type TabItem = {
  id: Tab;
  label: string;
  icon: typeof Bot;
  detail: string;
};

type Integration = {
  key: string;
  name: string;
  description: string;
  icon: typeof CalendarDays;
};

const baseTabs: TabItem[] = [
  {
    id: "overview",
    label: "Dashboard",
    icon: LayoutDashboard,
    detail: "Overview",
  },
  {
    id: "chat",
    label: "AI Chat",
    icon: MessageSquare,
    detail: "GPT & Claude",
  },
  {
    id: "images",
    label: "AI Images",
    icon: ImageIcon,
    detail: "Generate visuals",
  },
  {
    id: "composio",
    label: "Integrations",
    icon: Workflow,
    detail: "Connected apps",
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    detail: "Plans & usage",
  },
];

const integrations: Integration[] = [
  {
    key: "googlecalendar",
    name: "Google Calendar",
    description: "Create and manage calendar events.",
    icon: CalendarDays,
  },
  {
    key: "gmail",
    name: "Gmail",
    description: "Read, draft and send email.",
    icon: Mail,
  },
  {
    key: "googledrive",
    name: "Google Drive",
    description: "Find, upload and organise files.",
    icon: Cloud,
  },
  {
    key: "notion",
    name: "Notion",
    description: "Create and update workspace pages.",
    icon: BookOpenText,
  },
  {
    key: "slack",
    name: "Slack",
    description: "Search and send workspace messages.",
    icon: MessageSquare,
  },
  {
    key: "github",
    name: "GitHub",
    description: "Manage repositories, issues and pull requests.",
    icon: GitBranch,
  },
];

const presets: Record<"openai" | "claude", string[]> = {
  openai: [
    "Create a 30-day business growth plan",
    "Help me solve this problem step by step",
    "Plan this week's highest-priority tasks",
  ],
  claude: [
    "Summarise the attached document",
    "Turn my notes into a professional proposal",
    "Review this file and highlight the key information",
  ],
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: "openai" | "claude";
  createdAt: string;
};

type SavedChat = {
  id: string;
  title: string;
  model: "openai" | "claude";
  messages: ChatMessage[];
  updatedAt: string;
};

type BillingStatus = {
  plan: "free" | "pro" | "business";
  planDetails: {
    name: string;
    monthlyPrice: number;
    monthlyRequests: number;
    integrations: number;
    teamSeats: number;
  };
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  referralCode: string | null;
  usage: { openai: number; claude: number };
};

type UsageHistoryPoint = {
  periodStart: string;
  label: string;
  openai: number;
  claude: number;
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardShell({
  email,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<Tab>(isAdmin ? "admin" : "overview");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fileError, setFileError] = useState("");
  const [integrationMessage, setIntegrationMessage] = useState("");
  const [integrationLoading, setIntegrationLoading] = useState<string | null>(null);
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [usageHistory, setUsageHistory] = useState<UsageHistoryPoint[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [generatedImage, setGeneratedImage] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageMessage, setImageMessage] = useState("");
  const [adminData, setAdminData] = useState<any>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [chatModel, setChatModel] = useState<"openai" | "claude">("openai");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginMessage, setAdminLoginMessage] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(isAdmin);
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [incognitoPromptOpen, setIncognitoPromptOpen] = useState(false);
  const [incognitoPassword, setIncognitoPassword] = useState("");
  const [incognitoMessage, setIncognitoMessage] = useState("");
  const [incognitoLoading, setIncognitoLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tabs = baseTabs;

  const active = useMemo(
    () => tabs.find((item) => item.id === tab) ?? tabs[0],
    [tab, tabs]
  );

  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    void loadBilling();
    void loadUsageHistory();
    try {
      const stored = window.localStorage.getItem("platinum-pulse-chats");
      if (stored) setSavedChats(JSON.parse(stored));
    } catch {}
    const params = new URLSearchParams(window.location.search);
    if (params.get("composio") === "connected") {
      setTab("composio");
      setIntegrationMessage("App connected successfully. Refreshing status...");
      void refreshConnections();
      window.history.replaceState({}, "", "/dashboard");
    }
    if (params.get("billing") === "success") {
      setTab("billing");
      setBillingMessage("Payment completed. Your plan will update as soon as Stripe confirms it.");
      window.history.replaceState({}, "", "/dashboard");
      window.setTimeout(() => void loadBilling(), 1800);
    }
    if (params.get("billing") === "cancelled") {
      setTab("billing");
      setBillingMessage("Checkout was cancelled. No payment was taken.");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  async function signOut() {
    await Promise.allSettled([
      supabase.auth.signOut(),
      fetch("/api/admin/logout", { method: "POST" }),
    ]);

    window.location.href = "/login";
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    setFileError("");

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`${file.name} is larger than 10 MB.`);
        return false;
      }
      return true;
    });

    setFiles((currentFiles) => {
      const combined = [...currentFiles, ...validFiles];

      const uniqueFiles = combined.filter(
        (file, index, allFiles) =>
          index ===
          allFiles.findIndex(
            (otherFile) =>
              otherFile.name === file.name &&
              otherFile.size === file.size
          )
      );

      if (uniqueFiles.length > MAX_FILES) {
        setFileError(`You can attach up to ${MAX_FILES} files at once.`);
      }

      return uniqueFiles.slice(0, MAX_FILES);
    });

    event.target.value = "";
  }

  function removeFile(indexToRemove: number) {
    setFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== indexToRemove)
    );
    setFileError("");
  }

  function clearFiles() {
    setFiles([]);
    setFileError("");
  }

  async function submit() {
    if (
      (!prompt.trim() && files.length === 0) ||
      loading ||
      tab === "overview" ||
      tab === "composio" ||
      tab === "images" ||
      tab === "billing" ||
      tab === "admin"
    ) {
      return;
    }

    const userText = prompt.trim() || (files.length ? `Analyse ${files.length} attached file${files.length === 1 ? "" : "s"}.` : "");
    if (tab === "chat") {
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: userText, model: chatModel, createdAt: new Date().toISOString() };
      setChatMessages((current) => [...current, userMessage]);
    }
    setLoading(true);
    setOutput("");

    const provider = tab === "chat" ? chatModel : tab === "openai" ? "openai" : "claude";
    const endpoint = provider === "openai" ? "/api/openai" : "/api/claude";

    try {
      let response: Response;

      if (files.length > 0) {
        const formData = new FormData();
        formData.append("prompt", prompt.trim());

        files.forEach((file) => {
          formData.append("files", file);
        });

        response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "The request could not be completed."
        );
      }

      const responseText = data.text || JSON.stringify(data.result ?? data, null, 2);
      setOutput(responseText);
      void loadBilling();
      void loadUsageHistory();
      if (tab === "chat") {
        const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: responseText, model: chatModel, createdAt: new Date().toISOString() };
        setChatMessages((current) => {
          const next = [...current, assistantMessage];
          if (!incognitoMode) saveChat(next, chatModel);
          return next;
        });
        setPrompt("");
        setFiles([]);
      }
    } catch (error) {
      setOutput(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function persistChats(next: SavedChat[]) {
    if (incognitoMode) return;
    setSavedChats(next);
    window.localStorage.setItem("platinum-pulse-chats", JSON.stringify(next));
  }

  function saveChat(messages: ChatMessage[], model: "openai" | "claude") {
    if (incognitoMode || !messages.length) return;
    const id = activeChatId ?? crypto.randomUUID();
    if (!activeChatId) setActiveChatId(id);
    const firstUser = messages.find((message) => message.role === "user")?.content ?? "New conversation";
    const chat: SavedChat = { id, title: firstUser.slice(0, 42), model, messages, updatedAt: new Date().toISOString() };
    const next = [chat, ...savedChats.filter((item) => item.id !== id)].slice(0, 40);
    persistChats(next);
  }

  function newChat() {
    setActiveChatId(null);
    setChatMessages([]);
    setPrompt("");
    setOutput("");
    setFiles([]);
  }

  function openSavedChat(chat: SavedChat) {
    setActiveChatId(chat.id);
    setChatMessages(chat.messages);
    setChatModel(chat.model);
    setTab("chat");
    setOutput(chat.messages.filter((m) => m.role === "assistant").at(-1)?.content ?? "");
  }

  function deleteSavedChat(id: string) {
    persistChats(savedChats.filter((chat) => chat.id !== id));
    if (activeChatId === id) newChat();
  }

  function startVoiceInput() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setOutput("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setPrompt((current) => `${current}${current ? " " : ""}${transcript}`);
    };
    recognition.start();
  }

  async function unlockIncognito() {
    if (incognitoLoading) return;
    setIncognitoMessage("");

    if (!incognitoPassword) {
      setIncognitoMessage("Enter your account password.");
      return;
    }

    setIncognitoLoading(true);

    try {
      const response = await fetch("/api/incognito/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: incognitoPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Password could not be verified.");
      }

      newChat();
      setIncognitoMode(true);
      setIncognitoPromptOpen(false);
      setIncognitoPassword("");
      setIncognitoMessage("");
    } catch (error) {
      setIncognitoMessage(
        error instanceof Error ? error.message : "Password could not be verified."
      );
    } finally {
      setIncognitoLoading(false);
    }
  }

  function exitIncognito() {
    setIncognitoMode(false);
    setIncognitoPassword("");
    setIncognitoMessage("");
    newChat();
  }

  async function adminLogin() {
    setAdminLoginMessage("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: adminUsername, password: adminPassword }) });
    const data = await response.json();
    if (!response.ok) { setAdminLoginMessage(data.error || "Admin login failed."); return; }
    setAdminUnlocked(true);
    setAdminLoginOpen(false);
    setAdminUsername("");
    setAdminPassword("");
    setTab("admin");
    window.setTimeout(() => void loadAdmin(), 50);
  }

  async function connectIntegration(toolkit: string) {
    setIntegrationMessage("");
    setIntegrationLoading(toolkit);

    try {
      const response = await fetch("/api/composio/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toolkit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not start connection.");
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      setIntegrationMessage(
        data.message || "Connection started successfully."
      );
    } catch (error) {
      setIntegrationMessage(
        error instanceof Error
          ? error.message
          : "Connection failed."
      );
    } finally {
      setIntegrationLoading(null);
    }
  }

  async function refreshConnections() {
    setIntegrationMessage("");
    setIntegrationLoading("refresh");

    try {
      const response = await fetch("/api/composio/status");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load connections.");
      }

      setConnectedApps(
        Array.isArray(data.connectedToolkits)
          ? data.connectedToolkits
          : []
      );
      setIntegrationMessage("Connection status refreshed.");
    } catch (error) {
      setIntegrationMessage(
        error instanceof Error
          ? error.message
          : "Could not refresh connections."
      );
    } finally {
      setIntegrationLoading(null);
    }
  }

  async function loadUsageHistory() {
    try {
      const response = await fetch("/api/usage/history", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load usage history.");
      }

      setUsageHistory(
        Array.isArray(data.history) ? data.history : []
      );
    } catch {
      setUsageHistory([]);
    }
  }

  async function generateImage() {
    if (!imagePrompt.trim() || imageLoading) return;

    setImageLoading(true);
    setImageMessage("");
    setGeneratedImage("");

    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          size: imageSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image generation failed.");
      }

      setGeneratedImage(String(data.image ?? ""));
      setImageMessage(
        data.demo
          ? "Demo image generated. Turn DEMO_MODE off to use OpenAI image generation."
          : "Image generated successfully."
      );
      void loadBilling();
      void loadUsageHistory();
    } catch (error) {
      setImageMessage(
        error instanceof Error
          ? error.message
          : "Image generation failed."
      );
    } finally {
      setImageLoading(false);
    }
  }

  function downloadGeneratedImage() {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `platinum-pulse-image-${Date.now()}.png`;
    link.click();
  }

  async function loadBilling() {
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load billing.");
      setBilling(data);
    } catch (error) {
      setBillingMessage(error instanceof Error ? error.message : "Could not load billing.");
    }
  }

  async function startCheckout(plan: "pro" | "business") {
    setBillingLoading(true);
    setBillingMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start checkout.");
      if (data.url) window.location.href = data.url;
    } catch (error) {
      setBillingMessage(error instanceof Error ? error.message : "Could not start checkout.");
      setBillingLoading(false);
    }
  }

  async function openBillingPortal() {
    setBillingLoading(true);
    setBillingMessage("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open billing portal.");
      if (data.url) window.location.href = data.url;
    } catch (error) {
      setBillingMessage(error instanceof Error ? error.message : "Could not open billing portal.");
      setBillingLoading(false);
    }
  }

  async function loadAdmin() {
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load admin data.");
      setAdminData(data);
      setAdminMessage("");
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "Could not load admin data.");
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function switchTab(next: Tab) {
    setTab(next);
    if (next === "admin") void loadAdmin();
    setPrompt("");
    setOutput("");
    setFiles([]);
    setFileError("");
    setIntegrationMessage("");
    setMobileOpen(false);
  }

  function getPageDescription() {
    switch (tab) {
      case "chat":
        return incognitoMode
          ? "Private session active. This chat will be erased when you leave incognito mode."
          : "One conversation space with model switching, attachments, voice input and saved history.";
      case "openai":
        return "Use OpenAI for planning, coding, research, ideas and everyday problem-solving.";
      case "claude":
        return "Use Claude for long documents, detailed analysis, professional writing and file review.";
      case "images":
        return "Create original visuals with OpenAI image generation and download the finished result.";
      case "composio":
        return "Connect your own apps through Composio so the workspace can take real actions for you.";
      case "billing":
        return "Manage your subscription, monthly AI usage and billing details.";
      case "admin":
        return "Review users, subscription plans and account status.";
      default:
        return "OpenAI, Claude and Composio together in one workspace.";
    }
  }

  function getPlaceholder() {
    if (tab === "chat") return `Message ${chatModel === "openai" ? "GPT" : "Claude"}...`;
    if (tab === "openai") {
      return "Ask OpenAI a question, describe a problem or attach files for analysis...";
    }

    return "Describe what you want Claude to create, review or summarise...";
  }

  return (
    <main className="app-shell">
      <button
        type="button"
        className="mobile-menu"
        onClick={() => setMobileOpen((current) => !current)}
        aria-label={
          mobileOpen ? "Close navigation" : "Open navigation"
        }
      >
        {mobileOpen ? <X /> : <Menu />}
      </button>

      <aside
        className={mobileOpen ? "sidebar open" : "sidebar"}
      >
        <div className="brand premium-brand">
          <img
            src="/platinum-pulse-logo.jpeg"
            alt="Platinum Pulse"
          />

          <div>
            <strong>PLATINUM PULSE</strong>
            <span>AI WORKSPACE</span>
          </div>
        </div>

        <nav>
          {tabs.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.id}
                className={
                  tab === item.id
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() => switchTab(item.id)}
              >
                <Icon size={19} />
                <span>
                  <b>{item.label}</b>
                  <small>{item.detail}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="account-card">
          <UserCircle2 size={22} />
          <div>
            <b>{email}</b>
            <small>Signed in securely</small>
          </div>
        </div>

        {!adminUnlocked && (
          <button type="button" className="signout admin-access" onClick={() => setAdminLoginOpen(true)}>
            <LogIn size={17} /> Admin login
          </button>
        )}

        <button
          type="button"
          className="signout"
          onClick={signOut}
        >
          <LogOut size={17} />
          Sign out
        </button>
      </aside>

      <section className="workspace">
        {tab === "overview" ? (
          <>
            <header className="topbar">
              <div>
                <span className="eyebrow">
                  <Zap size={14} />
                  Platinum Pulse workspace
                </span>
                <h1>Dashboard</h1>
                <p>{getPageDescription()}</p>
              </div>

              <div className="status">
                <i />
                SYSTEM READY
              </div>
            </header>

            <section className="welcome-card premium-welcome">
              <div>
                <span className="eyebrow">
                  Welcome back
                </span>

                <h2>
                  Three powerful platforms. One clean workspace.
                </h2>

                <p>
                  Use OpenAI for everyday intelligence, Claude
                  for documents and deep analysis, and Composio
                  to connect your own apps and accounts.
                </p>
              </div>

              <img
                src="/platinum-pulse-logo.jpeg"
                alt="Platinum Pulse"
              />
            </section>

            <div className="metric-grid">
              <div>
                <Activity />
                <span>
                  <b>{billing?.planDetails.name ?? "Free"}</b>
                  <small>Current subscription</small>
                </span>
              </div>

              <div>
                <ShieldCheck />
                <span>
                  <b>Secure</b>
                  <small>Protected workspace</small>
                </span>
              </div>

              <div>
                <Clock3 />
                <span>
                  <b>24/7</b>
                  <small>Available whenever needed</small>
                </span>
              </div>
            </div>

            <div className="provider-grid">
              <button type="button" className="provider-card featured-provider" onClick={() => switchTab("chat")}>
                <div className="provider-icon"><MessageSquare /></div>
                <span><b>Unified AI Chat</b><small>Switch between GPT and Claude, attach files and keep conversation history.</small></span>
                <Sparkles size={17} />
              </button>
              <button
                type="button"
                className="provider-card"
                onClick={() => { setChatModel("openai"); switchTab("chat"); }}
              >
                <div className="provider-icon">
                  <Bot />
                </div>
                <span>
                  <b>OpenAI</b>
                  <small>
                    AI assistant, coding, planning and analysis
                  </small>
                </span>
                <Sparkles size={17} />
              </button>

              <button
                type="button"
                className="provider-card"
                onClick={() => { setChatModel("claude"); switchTab("chat"); }}
              >
                <div className="provider-icon">
                  <FileText />
                </div>
                <span>
                  <b>Claude</b>
                  <small>
                    Documents, long-form writing and deep review
                  </small>
                </span>
                <Sparkles size={17} />
              </button>

              <button
                type="button"
                className="provider-card"
                onClick={() => switchTab("images")}
              >
                <div className="provider-icon">
                  <ImageIcon />
                </div>
                <span>
                  <b>AI Image Generation</b>
                  <small>
                    Create original square, landscape and portrait visuals
                  </small>
                </span>
                <Sparkles size={17} />
              </button>

              <button
                type="button"
                className="provider-card"
                onClick={() => switchTab("composio")}
              >
                <div className="provider-icon">
                  <Workflow />
                </div>
                <span>
                  <b>Composio</b>
                  <small>
                    Calendar, email, Drive, Slack, Notion and more
                  </small>
                </span>
                <Link2 size={17} />
              </button>
            </div>
          </>
        ) : tab === "chat" ? (
          <>
            <header className="topbar chat-topbar">
              <div><span className="eyebrow"><MessageSquare size={14} /> Platinum Pulse intelligence</span><h1>AI Workspace</h1><p>{getPageDescription()}</p></div>
              <div className="chat-header-actions">
                <button
                  type="button"
                  className={incognitoMode ? "incognito-toggle active" : "incognito-toggle"}
                  onClick={() => incognitoMode ? exitIncognito() : setIncognitoPromptOpen(true)}
                >
                  {incognitoMode ? <ShieldOff size={17}/> : <LockKeyhole size={17}/>}
                  {incognitoMode ? "Exit incognito" : "Incognito"}
                </button>
                <button type="button" className="refresh-integrations" onClick={newChat}><Plus size={17} /> New chat</button>
              </div>
            </header>
            <div className="chat-layout">
              <aside className={incognitoMode ? "chat-history-panel incognito-panel" : "chat-history-panel"}>
                {incognitoMode ? (
                  <div className="incognito-history-state">
                    <div className="incognito-lock"><ShieldOff size={24}/></div>
                    <b>Incognito session</b>
                    <p>This conversation is not added to chat history and is erased when you exit incognito mode, refresh, sign out or close the tab.</p>
                    <span>Your account password was verified to unlock this session. It is never stored.</span>
                    <button type="button" className="new-chat-button" onClick={newChat}><Trash2 size={16}/> Clear private chat</button>
                  </div>
                ) : (
                  <>
                    <div className="chat-history-head"><span><History size={16} /> Chat history</span><small>{savedChats.length} saved</small></div>
                    <button type="button" className="new-chat-button" onClick={newChat}><Plus size={16} /> Start new conversation</button>
                    <div className="chat-history-list">
                      {savedChats.length === 0 ? <p className="chat-history-empty">Your conversations will appear here.</p> : savedChats.map((chat) => (
                        <div className={activeChatId === chat.id ? "history-item active" : "history-item"} key={chat.id}>
                          <button type="button" onClick={() => openSavedChat(chat)}><b>{chat.title}</b><small>{chat.model === "openai" ? "GPT" : "Claude"} · {new Date(chat.updatedAt).toLocaleDateString()}</small></button>
                          <button type="button" className="history-delete" onClick={() => deleteSavedChat(chat.id)} aria-label="Delete chat"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </aside>
              <section className="chat-workspace-panel">
                <div className="model-switcher">
                  <span>Model</span>
                  <button type="button" className={chatModel === "openai" ? "selected" : ""} onClick={() => setChatModel("openai")}><Bot size={15} /> GPT-5</button>
                  <button type="button" className={chatModel === "claude" ? "selected" : ""} onClick={() => setChatModel("claude")}><FileText size={15} /> Claude</button>
                  {incognitoMode && <div className="incognito-badge"><ShieldOff size={13}/> Private · not saved</div>}
                  <div className="model-usage-mini">{billing?.planDetails.name ?? "Free"} · {chatModel === "openai" ? billing?.usage.openai ?? 0 : billing?.usage.claude ?? 0}/{billing?.planDetails.monthlyRequests ?? 25}</div>
                </div>
                <div className="messages-scroll">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty-state"><img src="/platinum-pulse-logo.jpeg" alt="Platinum Pulse" /><span className="eyebrow">Platinum Pulse AI</span><h2>What are we building today?</h2><p>{incognitoMode ? "Private chat is active. Nothing from this session will be saved to your history." : "Ask a question, plan a project, analyse a file or use voice input."}</p><div className="chat-starters">{["Build a growth strategy", "Write a professional proposal", "Analyse my attached file"].map((item) => <button type="button" key={item} onClick={() => setPrompt(item)}>{item}</button>)}</div></div>
                  ) : chatMessages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}><div className="chat-avatar">{message.role === "user" ? <UserCircle2 size={18} /> : message.model === "openai" ? <Bot size={18} /> : <FileText size={18} />}</div><div><span>{message.role === "user" ? "You" : message.model === "openai" ? "GPT" : "Claude"}</span><p>{message.content}</p></div></article>)}
                  {loading && <article className="chat-message assistant"><div className="chat-avatar"><Loader2 className="spin" size={18} /></div><div><span>{chatModel === "openai" ? "GPT" : "Claude"}</span><p>Thinking…</p></div></article>}
                </div>
                {files.length > 0 && <div className="chat-attachments">{files.map((file,index)=><div key={`${file.name}-${index}`}><Paperclip size={14}/><span>{file.name}</span><button type="button" onClick={()=>removeFile(index)}><X size={13}/></button></div>)}</div>}
                <div className="chat-composer">
                  <input ref={fileInputRef} type="file" multiple hidden accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.xls,.xlsx,.ppt,.pptx,image/*,audio/*" onChange={handleFiles} />
                  <button type="button" className="composer-tool" onClick={() => fileInputRef.current?.click()} aria-label="Attach files"><Paperclip size={19}/></button>
                  <textarea value={prompt} onChange={(event)=>setPrompt(event.target.value)} placeholder={getPlaceholder()} onKeyDown={(event)=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void submit();}}} />
                  <button type="button" className={listening ? "composer-tool listening" : "composer-tool"} onClick={startVoiceInput} aria-label="Voice input"><Mic size={19}/></button>
                  <button type="button" className="chat-send" onClick={submit} disabled={loading || (!prompt.trim() && files.length===0)}>{loading?<Loader2 className="spin" size={19}/>:<Send size={19}/>}</button>
                </div>
                {fileError && <div className="file-error chat-file-error">{fileError}</div>}
              </section>
            </div>
          </>
        ) : tab === "images" ? (
          <>
            <header className="topbar">
              <div>
                <span className="eyebrow">
                  <ImageIcon size={14} /> Platinum Pulse creative
                </span>
                <h1>AI Image Generation</h1>
                <p>{getPageDescription()}</p>
              </div>
              <div className="status">
                <i /> OPENAI READY
              </div>
            </header>

            {imageMessage && (
              <div className="integration-message">{imageMessage}</div>
            )}

            <div className="image-studio-grid">
              <section className="image-prompt-card">
                <div className="panel-title">
                  <div>
                    <Sparkles size={19} />
                    <span>
                      <b>Create an image</b>
                      <small>
                        Describe the subject, style, lighting and composition.
                      </small>
                    </span>
                  </div>
                </div>

                <div className="image-preset-row">
                  {[
                    "Premium product advert on a dark futuristic set",
                    "Professional social media campaign poster",
                    "Modern app hero illustration with cinematic lighting",
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setImagePrompt(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  className="image-prompt-input"
                  value={imagePrompt}
                  onChange={(event) => setImagePrompt(event.target.value)}
                  placeholder="Example: A cinematic premium technology advert, dark blue glass environment, dramatic lighting, highly detailed..."
                />

                <label className="image-size-field">
                  <span>Image format</span>
                  <select
                    value={imageSize}
                    onChange={(event) => setImageSize(event.target.value)}
                  >
                    <option value="1024x1024">Square · 1024 × 1024</option>
                    <option value="1536x1024">Landscape · 1536 × 1024</option>
                    <option value="1024x1536">Portrait · 1024 × 1536</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="login-primary"
                  onClick={generateImage}
                  disabled={imageLoading || !imagePrompt.trim()}
                >
                  {imageLoading ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <ImageIcon size={18} />
                  )}
                  {imageLoading ? "Generating image..." : "Generate image"}
                </button>

                <p className="image-usage-note">
                  Image generations use your OpenAI allowance and may incur
                  separate OpenAI API costs.
                </p>
              </section>

              <section className="image-result-card">
                {generatedImage ? (
                  <>
                    <img
                      src={generatedImage}
                      alt="AI-generated result"
                    />
                    <div className="image-result-actions">
                      <button
                        type="button"
                        className="refresh-integrations"
                        onClick={downloadGeneratedImage}
                      >
                        <Download size={17} /> Download
                      </button>
                      <button
                        type="button"
                        className="refresh-integrations"
                        onClick={generateImage}
                        disabled={imageLoading}
                      >
                        <RefreshCw size={17} /> Generate another
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="image-result-empty">
                    <div className="provider-icon">
                      <ImageIcon size={25} />
                    </div>
                    <h2>Your image will appear here</h2>
                    <p>
                      Choose a format, write a detailed prompt and generate an
                      original visual.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </>
        ) : tab === "admin" ? (
          <>
            <header className="topbar">
              <div><span className="eyebrow"><Users size={14} /> Platinum Pulse admin</span><h1>Admin overview</h1><p>{getPageDescription()}</p></div>
              <button type="button" className="refresh-integrations" onClick={loadAdmin}><RefreshCw size={17} /> Refresh</button>
            </header>
            {adminMessage && <div className="integration-message">{adminMessage}</div>}
            <div className="metric-grid">
              <div><Users /><span><b>{adminData?.totalUsers ?? 0}</b><small>Total users</small></span></div>
              <div><Crown /><span><b>{adminData?.planSummary?.pro ?? 0}</b><small>Pro users</small></span></div>
              <div><ShieldCheck /><span><b>{adminData?.planSummary?.business ?? 0}</b><small>Business users</small></span></div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table"><thead><tr><th>Email</th><th>Plan</th><th>Status</th><th>Created</th></tr></thead><tbody>
                {(adminData?.users ?? []).map((user: any) => <tr key={user.id}><td>{user.email ?? "—"}</td><td>{user.plan ?? "free"}</td><td>{user.subscription_status ?? "free"}</td><td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</td></tr>)}
              </tbody></table>
            </div>
          </>
        ) : tab === "billing" ? (
          <>
            <header className="topbar">
              <div>
                <span className="eyebrow"><CreditCard size={14} /> Platinum Pulse billing</span>
                <h1>Plans & Usage</h1>
                <p>{getPageDescription()}</p>
              </div>
              {billing?.hasStripeCustomer && (
                <button type="button" className="refresh-integrations" onClick={openBillingPortal} disabled={billingLoading}>
                  <CreditCard size={17} /> Manage billing
                </button>
              )}
            </header>

            {billingMessage && <div className="integration-message">{billingMessage}</div>}

            <section className="billing-summary">
              <div className="current-plan-card">
                <div className="provider-icon"><Crown /></div>
                <div>
                  <span className="eyebrow">Current plan</span>
                  <h2>{billing?.planDetails.name ?? "Loading..."}</h2>
                  <p>Status: {billing?.subscriptionStatus ?? "Checking"}</p>
                </div>
              </div>
              <div className="usage-card">
                <Gauge />
                <div>
                  <b>OpenAI: {billing?.usage.openai ?? 0} / {billing?.planDetails.monthlyRequests ?? 25}</b>
                  <progress value={billing?.usage.openai ?? 0} max={billing?.planDetails.monthlyRequests ?? 25} />
                  <b>Claude: {billing?.usage.claude ?? 0} / {billing?.planDetails.monthlyRequests ?? 25}</b>
                  <progress value={billing?.usage.claude ?? 0} max={billing?.planDetails.monthlyRequests ?? 25} />
                </div>
              </div>
            </section>

            <section className="usage-chart-card">
              <div className="usage-chart-head">
                <div>
                  <span className="eyebrow">
                    <BarChart3 size={14} /> Usage trend
                  </span>
                  <h2>AI requests over six months</h2>
                  <p>
                    OpenAI includes chat, file analysis and image-generation requests.
                  </p>
                </div>
                <div className="usage-chart-legend">
                  <span><i className="openai-dot" /> OpenAI</span>
                  <span><i className="claude-dot" /> Claude</span>
                </div>
              </div>

              <div className="usage-chart">
                {usageHistory.map((point) => {
                  const maximum = Math.max(
                    1,
                    ...usageHistory.flatMap((entry) => [
                      entry.openai,
                      entry.claude,
                    ])
                  );

                  return (
                    <div className="usage-chart-column" key={point.periodStart}>
                      <div className="usage-bars">
                        <div
                          className="usage-bar openai-bar"
                          style={{
                            height: `${Math.max(4, (point.openai / maximum) * 100)}%`,
                          }}
                          title={`OpenAI: ${point.openai}`}
                        >
                          <span>{point.openai}</span>
                        </div>
                        <div
                          className="usage-bar claude-bar"
                          style={{
                            height: `${Math.max(4, (point.claude / maximum) * 100)}%`,
                          }}
                          title={`Claude: ${point.claude}`}
                        >
                          <span>{point.claude}</span>
                        </div>
                      </div>
                      <small>{point.label}</small>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="pricing-grid">
              <article className={billing?.plan === "free" ? "pricing-card featured" : "pricing-card"}>
                <span className="eyebrow">Free</span><h3>£0</h3><p>Try the workspace before upgrading.</p>
                <ul><li>25 OpenAI requests/month</li><li>25 Claude requests/month</li><li>1 connected integration</li><li>File uploads</li></ul>
                <button type="button" disabled>{billing?.plan === "free" ? "Current plan" : "Free plan"}</button>
              </article>
              <article className={billing?.plan === "pro" ? "pricing-card featured" : "pricing-card"}>
                <span className="eyebrow">Pro</span><h3>£14.99 <small>/ month</small></h3><p>For individuals using AI every week.</p>
                <ul><li>750 OpenAI requests/month</li><li>750 Claude requests/month</li><li>Up to 10 integrations</li><li>File and image uploads</li></ul>
                <button type="button" onClick={() => startCheckout("pro")} disabled={billingLoading || billing?.plan === "pro"}>{billing?.plan === "pro" ? "Current plan" : "Upgrade to Pro"}</button>
              </article>
              <article className={billing?.plan === "business" ? "pricing-card featured" : "pricing-card"}>
                <span className="eyebrow">Business</span><h3>£39.99 <small>/ month</small></h3><p>For teams and heavier usage.</p>
                <ul><li>3,000 OpenAI requests/month</li><li>3,000 Claude requests/month</li><li>Up to 50 integrations</li><li>5 team seats scaffolded</li></ul>
                <button type="button" onClick={() => startCheckout("business")} disabled={billingLoading || billing?.plan === "business"}>{billing?.plan === "business" ? "Current plan" : "Choose Business"}</button>
              </article>
            </div>

            {billing?.referralCode && <div className="referral-card"><b>Your referral code</b><code>{billing.referralCode}</code><span>Referral rewards are scaffolded and can be activated later.</span></div>}
          </>
        ) : tab === "composio" ? (
          <>
            <header className="topbar">
              <div>
                <span className="eyebrow">
                  <Zap size={14} />
                  Platinum Pulse workspace
                </span>
                <h1>Composio</h1>
                <p>{getPageDescription()}</p>
              </div>

              <button
                type="button"
                className="refresh-integrations"
                onClick={refreshConnections}
                disabled={integrationLoading !== null}
              >
                {integrationLoading === "refresh" ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <RefreshCw size={17} />
                )}
                Refresh
              </button>
            </header>

            {integrationMessage && (
              <div className="integration-message">
                {integrationMessage}
              </div>
            )}

            <div className="integration-grid">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                const connected = connectedApps.includes(
                  integration.key
                );

                return (
                  <article
                    className="integration-card"
                    key={integration.key}
                  >
                    <div className="integration-card-head">
                      <div className="integration-icon">
                        <Icon size={22} />
                      </div>

                      <span
                        className={
                          connected
                            ? "connection-badge connected"
                            : "connection-badge"
                        }
                      >
                        {connected
                          ? "Connected"
                          : "Not connected"}
                      </span>
                    </div>

                    <h3>{integration.name}</h3>
                    <p>{integration.description}</p>

                    <button
                      type="button"
                      className="integration-button"
                      onClick={() =>
                        connectIntegration(integration.key)
                      }
                      disabled={integrationLoading !== null}
                    >
                      {integrationLoading ===
                      integration.key ? (
                        <Loader2
                          className="spin"
                          size={17}
                        />
                      ) : connected ? (
                        <Unplug size={17} />
                      ) : (
                        <Link2 size={17} />
                      )}

                      {connected ? "Reconnect" : "Connect"}
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <header className="topbar">
              <div>
                <span className="eyebrow">
                  <Zap size={14} />
                  Platinum Pulse workspace
                </span>

                <h1>{active.label}</h1>
                <p>{getPageDescription()}</p>
              </div>

              <div className="status">
                <i />
                SYSTEM READY
              </div>
            </header>

            <div className="hero-grid">
              <section className="composer panel">
                <div className="panel-title">
                  <div>
                    <Sparkles size={19} />
                    <span>
                      <b>
                        {tab === "openai"
                          ? "Ask OpenAI"
                          : "Work with Claude"}
                      </b>
                      <small>
                        Write a request or attach images and files.
                      </small>
                    </span>
                  </div>
                </div>

                <div className="preset-row">
                  {presets[tab].map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setPrompt(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <textarea
                  value={prompt}
                  onChange={(event) =>
                    setPrompt(event.target.value)
                  }
                  placeholder={getPlaceholder()}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.xls,.xlsx,.ppt,.pptx,image/*"
                  onChange={handleFiles}
                />

                <div className="attachment-actions">
                  <button
                    type="button"
                    className="attach-button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      loading || files.length >= MAX_FILES
                    }
                  >
                    <Paperclip size={17} />
                    Attach images or files
                  </button>

                  {files.length > 0 && (
                    <button
                      type="button"
                      className="clear-files"
                      onClick={clearFiles}
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                      Clear all
                    </button>
                  )}
                </div>

                {fileError && (
                  <div className="file-error">
                    {fileError}
                  </div>
                )}

                {files.length > 0 && (
                  <div className="attached-files">
                    {files.map((file, index) => (
                      <div
                        className="attached-file"
                        key={`${file.name}-${file.size}-${index}`}
                      >
                        <File size={17} />

                        <span>
                          <b>{file.name}</b>
                          <small>
                            {formatFileSize(file.size)}
                          </small>
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={loading}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="primary"
                  disabled={
                    (!prompt.trim() &&
                      files.length === 0) ||
                    loading
                  }
                  onClick={submit}
                >
                  {loading ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}

                  {loading ? "Working..." : "Send request"}
                </button>
              </section>

              <section className="result panel">
                <div className="panel-title">
                  <div>
                    <active.icon size={19} />
                    <span>
                      <b>{active.label} output</b>
                      <small>
                        Your result will appear here.
                      </small>
                    </span>
                  </div>

                  {output && (
                    <button
                      type="button"
                      className="copy"
                      onClick={copyOutput}
                    >
                      {copied ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}

                      {copied ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>

                {!output ? (
                  <div className="empty">
                    <img
                      src="/platinum-pulse-logo.jpeg"
                      alt="Platinum Pulse"
                    />

                    <b>Waiting for your request</b>
                    <span>
                      Ask a question or attach a file to get started.
                    </span>
                  </div>
                ) : (
                  <div className="output">
                    <pre>{output}</pre>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </section>
      {incognitoPromptOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="Unlock incognito mode">
          <section className="admin-login-modal incognito-unlock-modal">
            <button type="button" className="modal-close" onClick={() => { setIncognitoPromptOpen(false); setIncognitoPassword(""); setIncognitoMessage(""); }}><X size={18}/></button>
            <div className="provider-icon"><KeyRound size={22}/></div>
            <span className="eyebrow">Private AI session</span>
            <h2>Unlock incognito mode</h2>
            <p>Enter the password for your account. The password is only used to verify you and is never saved.</p>
            <label className="field"><span>Account password</span><div><LockKeyhole size={17}/><input type="password" value={incognitoPassword} onChange={(event)=>setIncognitoPassword(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter") void unlockIncognito();}} placeholder="Enter your account password" autoComplete="current-password"/></div></label>
            {incognitoMessage && <div className="auth-message">{incognitoMessage}</div>}
            <button type="button" className="login-primary" onClick={unlockIncognito} disabled={incognitoLoading}>{incognitoLoading?<Loader2 className="spin" size={18}/>:<ShieldOff size={18}/>} {incognitoLoading?"Verifying...":"Start private chat"}</button>
            <small className="incognito-disclaimer">Google-only accounts need to set an account password before using password-protected incognito mode.</small>
          </section>
        </div>
      )}
    </main>
  );
}
