import React from "react";
import { FloatingWhatsApp } from "@digicroz/react-floating-whatsapp";

export default function WhatsAppFloat() {
  const raw = import.meta.env.VITE_WHATSAPP_NUMBER || "919999999999";
  const phoneNumber = String(raw).replace(/\D/g, "");

  return (
    <FloatingWhatsApp
      phoneNumber={phoneNumber}
      accountName="Rozgar Mitra"
      allowClickAway={true}
      notification={true}
      notificationDelay={30}
      statusMessage="Typically replies within an hour"
      chatMessage="नमस्ते! कैसे मदद कर सकता हूँ?"
      buttonStyle={{ backgroundColor: "#25D366", width: 52, height: 52, borderRadius: 26 }}
      style={{ zIndex: 9999 }}
    />
  );
}
