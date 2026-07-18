import { useState, useEffect } from "react";
import { Facebook, Instagram, MapPin, Phone, Mail, MessageCircle, Music2 } from "lucide-react";
import { websiteApi } from "../../lib/api.js";
import { useStore } from "../../store/useStore.js";
import { Card } from "../../components/ui.jsx";
import WebsiteNav from "./WebsiteNav.jsx";

export default function Contacts() {
  const { settings, loadSettings } = useStore();
  const [contacts, setContacts] = useState({});

  useEffect(() => {
    loadSettings();
    websiteApi.getContacts().then((data) => setContacts(data));
  }, []);

  const links = [
    contacts.facebook && { icon: Facebook, label: "Facebook", href: contacts.facebook, color: "text-[#8FB4D9]" },
    contacts.instagram && { icon: Instagram, label: "Instagram", href: contacts.instagram, color: "text-[#AFA0C9]" },
    contacts.tiktok && { icon: Music2, label: "TikTok", href: contacts.tiktok, color: "text-text-primary" },
    contacts.whatsapp && { icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/${contacts.whatsapp.replace(/[^0-9]/g, "")}`, color: "text-[#5FBE9A]" },
    contacts.maps && { icon: MapPin, label: "Google Maps", href: contacts.maps, color: "text-crimson-300" },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-transparent">
      <WebsiteNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="heading text-3xl text-text-primary mb-2">Contactez-nous</h1>
        <p className="text-text-muted mb-8">{settings?.name} — {settings?.address}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {settings?.phone && (
            <Card className="p-5 flex items-center gap-4"><Phone className="text-crimson-300" size={24} /><div><p className="label-caps">Téléphone</p><p className="text-text-primary">{settings.phone}</p></div></Card>
          )}
          {settings?.email && (
            <Card className="p-5 flex items-center gap-4"><Mail className="text-crimson-300" size={24} /><div><p className="label-caps">Email</p><p className="text-text-primary">{settings.email}</p></div></Card>
          )}
          {settings?.address && (
            <Card className="p-5 flex items-center gap-4 sm:col-span-2"><MapPin className="text-crimson-300" size={24} /><div><p className="label-caps">Adresse</p><p className="text-text-primary">{settings.address}</p></div></Card>
          )}
        </div>

        {links.length > 0 && (
          <>
            <h2 className="heading text-lg text-text-primary mb-4">Suivez-nous</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="glass-card p-5 flex flex-col items-center gap-2 hover:border-crimson-500/60 transition">
                  <l.icon className={l.color} size={28} />
                  <span className="text-sm text-text-primary">{l.label}</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
