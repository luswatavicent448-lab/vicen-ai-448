import { Conversation } from "@/types/chat";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-background/60 z-30 sm:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-sidebar z-40 border-r border-sidebar-border flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } sm:translate-x-0 sm:static sm:z-auto`}
      >
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-sidebar-foreground tracking-wide uppercase">History</span>
          <div className="flex gap-1">
            <button
              onClick={onNew}
              className="w-8 h-8 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-sidebar-foreground flex items-center justify-center hover:bg-sidebar-accent transition-colors sm:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin space-y-1">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => { onSelect(c.id); onClose(); }}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                c.id === activeId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
              <span className="truncate flex-1">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 pt-4">No conversations yet</p>
          )}
        </div>
      </aside>
    </>
  );
}
