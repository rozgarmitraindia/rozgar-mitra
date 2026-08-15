import { useEffect } from "react";
import { useToast } from "../contexts/ToastContext.jsx";

export default function FileSelectionFeedback() {
  const toast = useToast();

  useEffect(() => {
    function handleFileSelection(event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file") return;

      const files = Array.from(input.files || []);
      input.classList.toggle("file-selected", files.length > 0);

      if (!files.length) return;
      const message = files.length === 1
        ? `${files[0].name} selected successfully`
        : `${files.length} files selected successfully`;
      toast.show(message, "success");
    }

    document.addEventListener("change", handleFileSelection, true);
    return () => document.removeEventListener("change", handleFileSelection, true);
  }, [toast]);

  return null;
}
