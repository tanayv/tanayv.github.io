import type { FC } from "react";

type Role = {
  title: string;
  meta: string;
  detail?: string;
};

type Company = {
  name: string;
  logo: string;
  url: string;
  roles: Role[];
};

const COMPANIES: Company[] = [
  {
    name: "Shepherd",
    logo: "/work/shepherd.jpeg",
    url: "https://www.shepherdinsurance.com/",
    roles: [
      {
        title: "Software Engineer",
        meta: "Mar 2026 — Present · San Francisco, CA",
      },
    ],
  },
  {
    name: "PayPal",
    logo: "/work/paypal.jpeg",
    url: "https://www.paypal.com/us/digital-wallet/ways-to-pay/buy-now-pay-later",
    roles: [
      {
        title: "Senior Software Engineer",
        meta: "Mar 2025 — Mar 2026 · San Jose, CA",
      },
      {
        title: "Software Engineer II",
        meta: "Apr 2023 — Mar 2025 · Toronto, ON",
      },
      {
        title: "Software Engineer II",
        meta: "Jul 2021 — Apr 2023 · Washington, DC",
      },
      {
        title: "Software Engineer",
        meta: "Jun 2020 — Jul 2021 · Timonium, MD",
      },
    ],
  },
  {
    name: "Turkbox",
    logo: "/work/turkbox.jpeg",
    url: "https://turkbox.io/",
    roles: [
      {
        title: "Founder",
        meta: "May 2019 — Jun 2020 · Delhi, IN"
      },
    ],
  },
];

const About: FC = () => {
  return (
    <div className="about">
      <div className="about__intro">
        <div className="about__photo">
          <img src="/tanay.jpeg" alt="Tanay Vardhan" />
        </div>
        <div>
          <h1 className="about__hello">
            Hi, I'm <b>Tanay</b>.
          </h1>
          <div className="about__paras">
            <p>
              I'm a product-focused software engineer based in San Francisco, currently at{" "}
              <a href="https://www.shepherdinsurance.com/" target="_blank" rel="noreferrer">
                Shepherd
              </a>
              , where I work on core infrastructure to automate and scale underwriting workflows for commercial insurance.
            </p>
            <p>
              Previously, I was at PayPal building and maintaining products in{" "}
              <a
                href="https://www.paypal.com/us/digital-wallet/ways-to-pay/buy-now-pay-later"
                target="_blank"
                rel="noreferrer"
              >
                PayPal's Buy Now, Pay Later
              </a>{" "}
              portfolio, and before that, I founded{" "}
              <a href="/writing/turkbox/">Turkbox</a>, a platform exploring alternative ways to pay for journalism using data-labeling workflows for machine learning systems, which received a grant from the{" "}
              <a
                href="https://blog.google/company-news/inside-google/around-the-globe/google-asia/here-are-winners-gni-innovation-challenge-asia-pacific/"
                target="_blank"
                rel="noreferrer"
              >
                Google News Initiative
              </a>{" "}
              Innovation Challenge.
            </p>
            <p>
              I'm originally from New Delhi and studied Aerospace Engineering at the University of Illinois Urbana-Champaign.
            </p>
          </div>
        </div>
      </div>

      <div className="about__divider">
        <span>work</span>
      </div>

      <div className="timeline">
        {COMPANIES.map((c) => (
          <div
            className={`timeline__company${c.roles.length === 1 ? " timeline__company--solo" : ""}`}
            key={c.name}
          >
            <div className="timeline__logo" aria-hidden>
              <img src={c.logo} alt="" />
            </div>
            <div className="timeline__roles">
              <p className="timeline__company-name">
                <a
                  className="timeline__company-link"
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {c.name}
                  <span className="timeline__company-arrow" aria-hidden>
                    ↗
                  </span>
                </a>
              </p>
              {c.roles.map((r, i) => (
                <div className="timeline__role" key={`${c.name}-${i}`}>
                  <p className="timeline__role-title">{r.title}</p>
                  <p className="timeline__role-meta">{r.meta}</p>
                  {r.detail ? (
                    <p className="timeline__role-detail">{r.detail}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;
