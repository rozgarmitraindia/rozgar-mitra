export default function Contact() {
  return (
    <section className="simple-page">
      <div className="info-card">
        <div className="section-label">Contact</div>
        <h1 className="section-title">संपर्क करें / Contact Us</h1>
        <p className="section-desc">Support, verification help, employer hiring and room listing assistance.</p>
        <div className="form-row" style={{ marginTop: 24 }}>
          <input className="form-input" placeholder="Name / नाम" />
          <input className="form-input" placeholder="Mobile / मोबाइल" />
        </div>
        <textarea className="form-textarea" style={{ marginTop: 16 }} placeholder="Message / संदेश" />
        <button className="btn-primary" type="button" style={{ marginTop: 16 }}>Send Message</button>
      </div>
    </section>
  );
}
