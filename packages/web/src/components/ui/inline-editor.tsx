import { cn } from "@/lib/utils";
import { useEditMode } from "@/hooks/useEditMode";

interface InlineEditorProps {
  value: string;
  onSave: (value: string) => void;
  renderView: (props: { value: string; onEdit: () => void }) => React.ReactNode;
  renderEdit: (props: {
    draft: string;
    onChange: (v: string) => void;
    onSave: () => void;
    onCancel: () => void;
  }) => React.ReactNode;
  className?: string;
}

function InlineEditor({ value, onSave, renderView, renderEdit, className }: InlineEditorProps) {
  const edit = useEditMode(value);

  const handleSave = () => {
    onSave(edit.save());
  };

  return (
    <div className={cn(className)}>
      {edit.isEditing
        ? renderEdit({
            draft: edit.draft,
            onChange: edit.setDraft,
            onSave: handleSave,
            onCancel: edit.cancel,
          })
        : renderView({ value, onEdit: () => edit.startEditing(value) })}
    </div>
  );
}

export { InlineEditor };
