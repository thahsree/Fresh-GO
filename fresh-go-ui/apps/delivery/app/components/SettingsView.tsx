import { BadgeHelp, Bike, ChevronRight, MapPinned, ShieldCheck, Volume2 } from "lucide-react";
import { DeliverySettings } from "../models/delivery";

type SettingsViewProps = {
  settings: DeliverySettings;
  onUpdateSettings: (update: Partial<DeliverySettings>) => void;
  onOpenHelp?: () => void;
  onOpenSafety?: () => void;
  onOpenReport?: () => void;
};
type PreferenceToggleProps = { checked: boolean; description: string; label: string; onChange: (checked: boolean) => void };

function PreferenceToggle({ checked, description, label, onChange }: PreferenceToggleProps) {
  return <div className="preference-row"><div><strong>{label}</strong><span>{description}</span></div><button className={`switch ${checked ? "on" : ""}`} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><i /></button></div>;
}

export function SettingsView({ settings, onUpdateSettings, onOpenHelp, onOpenSafety, onOpenReport }: SettingsViewProps) {
  return <>
    <div className="view-heading"><p className="eyebrow">Account & preferences</p><h1>Settings</h1><p>Control how you receive and manage delivery work.</p></div>
    <section className="card profile-card"><span className="profile-initials">AK</span><div><h2>Arun Kumar</h2><p>Delivery partner · ID FF-DP-214</p></div><ChevronRight size={19} /></section>
    <section className="settings-section"><h2>Work preferences</h2><div className="card setting-card"><div className="setting-detail"><Bike size={18} /><div><span>Vehicle</span><strong>{settings.vehicle}</strong></div></div><div className="choice-group" aria-label="Vehicle">{(["Bike", "Scooter", "Car"] as const).map((vehicle) => <button key={vehicle} className={settings.vehicle === vehicle ? "active" : ""} type="button" onClick={() => onUpdateSettings({ vehicle })}>{vehicle}</button>)}</div><div className="setting-detail bordered"><MapPinned size={18} /><div><span>Preferred zone</span><strong>{settings.preferredZone}</strong></div><ChevronRight size={17} /></div></div></section>
    <section className="settings-section"><h2>Notifications</h2><div className="card setting-card preferences"><PreferenceToggle checked={settings.orderAlerts} label="New order alerts" description="Receive nearby delivery requests" onChange={(orderAlerts) => onUpdateSettings({ orderAlerts })} /><PreferenceToggle checked={settings.earningsAlerts} label="Earnings updates" description="Payout and incentive notifications" onChange={(earningsAlerts) => onUpdateSettings({ earningsAlerts })} /><PreferenceToggle checked={settings.soundAlerts} label="Sound alerts" description="Play a tone for new requests" onChange={(soundAlerts) => onUpdateSettings({ soundAlerts })} /></div></section>
    <section className="settings-section"><h2>Support & safety</h2><div className="card setting-card support-links"><button type="button" onClick={onOpenHelp}><BadgeHelp size={18} /> Help centre <ChevronRight size={17} /></button><button type="button" onClick={onOpenSafety}><ShieldCheck size={18} /> Safety toolkit <ChevronRight size={17} /></button><button type="button" onClick={onOpenReport}><Volume2 size={18} /> Report an issue <ChevronRight size={17} /></button></div></section>
  </>;
}
