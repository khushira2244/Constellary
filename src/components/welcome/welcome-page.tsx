import Image from "next/image";
import Link from "next/link";

export function WelcomePage() {
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <Link className="welcome-brand" href="/" aria-label="Constellary welcome">
          <span aria-hidden="true">✦</span>
          <strong>Constellary</strong>
        </Link>
        <nav className="welcome-header-actions" aria-label="Account">
          <Link className="welcome-action welcome-action--secondary" href="/login">Sign in</Link>
          <Link className="welcome-action welcome-action--primary" href="/signup">Create account</Link>
        </nav>
      </header>

      <main className="welcome-hero">
        <section className="welcome-copy">
          <h1>
            <span className="welcome-lead">Where ideas</span>
            <span className="welcome-grow">GROW</span>
            <span className="welcome-stack">get shaped</span>
            <span className="welcome-stack">shared</span>
            <span className="welcome-stack">and linked</span>
          </h1>
          <p className="welcome-support">through collaboration with people and AI.</p>
          <p className="welcome-proof">With proof.</p>
        </section>

        <section className="welcome-system" aria-label="Orbiting research constellation">
          <div className="welcome-orbit-glow" aria-hidden="true" />
          <Image
            alt="Green research planet"
            className="welcome-planet welcome-planet--large"
            height={64}
            priority
            src="/assets/planets/planet-10.png"
            unoptimized
            width={64}
          />
          <Image
            alt="Pink research planet"
            className="welcome-planet welcome-planet--pink"
            height={64}
            priority
            src="/assets/planets/planet-6.png"
            unoptimized
            width={64}
          />
          <Image
            alt="Blue research planet"
            className="welcome-planet welcome-planet--blue"
            height={64}
            priority
            src="/assets/planets/planet-7.png"
            unoptimized
            width={64}
          />
        </section>
      </main>
    </div>
  );
}
