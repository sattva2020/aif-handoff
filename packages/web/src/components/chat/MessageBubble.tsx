import { memo } from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import { AttachmentChip } from "@/components/ui/attachment-chip";
import { parseChatActions } from "@/lib/chatActions";
import { CreateTaskCard } from "./CreateTaskCard";
import type { ChatMessage } from "@aif/shared/browser";

interface MessageBubbleProps {
  message: ChatMessage;
  projectId: string;
  sessionId: string | null;
  onTaskCreated: () => void;
  onOpenTask?: (taskId: string) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  projectId,
  sessionId,
  onTaskCreated,
  onOpenTask,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const parsed = !isUser ? parseChatActions(message.content) : null;
  const displayContent = parsed?.text ?? message.content;
  const actions = parsed?.actions ?? [];

  return (
    <>
      {displayContent.trim() && (
        <div className={cn("flex gap-2.5 px-3 py-2", isUser ? "flex-row-reverse" : "flex-row")}>
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
              isUser ? "bg-blue-600 text-white" : "bg-violet-600 text-white",
            )}
          >
            {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          </div>
          <div
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm break-words",
              isUser ? "bg-blue-600/15 text-foreground" : "bg-violet-600/15 text-foreground",
            )}
          >
            <Markdown content={displayContent} className="text-sm" />
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {message.attachments.map((att, idx) =>
                  att.path && sessionId ? (
                    <a
                      key={idx}
                      href={`/chat/sessions/${sessionId}/attachments/${encodeURIComponent(att.name)}`}
                      download={att.name}
                    >
                      <AttachmentChip
                        name={att.name}
                        className="hover:text-foreground cursor-pointer"
                      />
                    </a>
                  ) : (
                    <AttachmentChip key={idx} name={att.name} className="text-muted-foreground" />
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {actions.map((action, i) =>
        action.type === "create_task" ? (
          <CreateTaskCard
            key={i}
            action={action}
            projectId={projectId}
            onCreated={onTaskCreated}
            onOpenTask={onOpenTask}
          />
        ) : null,
      )}
    </>
  );
});
