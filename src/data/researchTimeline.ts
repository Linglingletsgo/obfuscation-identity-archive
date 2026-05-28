export type ResearchTimelineLink = {
  label: string;
  url: string;
};

export type ResearchTimelineImage = {
  alt: string;
  src: string;
  tone:
    | "breach"
    | "book"
    | "database"
    | "law"
    | "platform"
    | "protest"
    | "surveillance";
};

export type ResearchTimelineEvent = {
  description: string;
  image?: ResearchTimelineImage;
  links: ResearchTimelineLink[];
  title: string;
  year: string;
};

export const researchTimelineEvents: ResearchTimelineEvent[] = [
  {
    "year": "2006",
    "title": "AOL Search Data Leak",
    "description": "AOL released a de-identified dataset of about 650,000 users and 20 million search queries. Although usernames were replaced by numeric IDs, search histories could still reveal personal details and enable re-identification.",
    "image": {
      "src": "/assets/timeline/aol-search-data-leak.jpg",
      "alt": "A real image reference for the 2006 AOL search data leak",
      "tone": "breach"
    },
    "links": [
      {
        "label": "EPIC",
        "url": "https://archive.epic.org/privacy/re-identification.html"
      }
    ]
  },
  {
    "year": "2006-2008",
    "title": "Netflix Prize De-anonymization",
    "description": "Netflix released an anonymized movie-rating dataset for the Netflix Prize. Researchers showed that some records could be de-anonymized by comparing the ratings with external IMDb data, demonstrating how preference data can become identifying data.",
    "links": [
      {
        "label": "Narayanan & Shmatikov paper",
        "url": "https://arxiv.org/abs/cs/0610105"
      }
    ]
  },
  {
    "year": "2006",
    "title": "TrackMeNot",
    "description": "TrackMeNot was developed as a browser tool that sends automatically generated search queries to search engines. It was designed to obscure real search interests by adding misleading query noise to the profile built from search data.",
    "image": {
      "src": "/assets/timeline/trackmenot-browser-obfuscation.jpg",
      "alt": "A real image reference for the TrackMeNot obfuscation browser tool",
      "tone": "database"
    },
    "links": [
      {
        "label": "TrackMeNot paper",
        "url": "https://arxiv.org/abs/1109.4677"
      }
    ]
  },
  {
    "year": "2012",
    "title": "Target Pregnancy Prediction",
    "description": "Target used shopping records to build a pregnancy prediction score and estimate a customer's pregnancy status and likely due-date window. Purchase patterns were used to assign predictive consumer categories before the customer explicitly disclosed that condition.",
    "links": [
      {
        "label": "NYT / Longreads archive",
        "url": "https://longreads.com/2012/02/16/how-companies-learn-your-secrets/"
      }
    ]
  },
  {
    "year": "2013",
    "title": "Facebook Likes Predict Private Traits",
    "description": "Kosinski, Stillwell and Graepel showed that Facebook Likes could be used to predict sensitive personal attributes, including sexual orientation, ethnicity, religious and political views, personality traits, age and gender.",
    "links": [
      {
        "label": "PNAS",
        "url": "https://www.pnas.org/doi/10.1073/pnas.1218772110"
      }
    ]
  },
  {
    "year": "2013",
    "title": "Snowden / PRISM",
    "description": "Documents disclosed by Edward Snowden reported that the NSA's PRISM program obtained data from major internet services. The disclosures brought large-scale state surveillance and platform-mediated data access into global public debate.",
    "image": {
      "src": "/assets/timeline/snowden-prism-slide.jpg",
      "alt": "A real PRISM disclosure slide associated with the Snowden surveillance reports",
      "tone": "surveillance"
    },
    "links": [
      {
        "label": "Guardian",
        "url": "https://www.theguardian.com/world/2013/jun/06/us-tech-giants-nsa-data"
      }
    ]
  },
  {
    "year": "2014",
    "title": "Facebook Emotional Contagion Experiment",
    "description": "Facebook and academic researchers manipulated the amount of positive or negative emotional content shown in users' News Feeds to test whether emotional expression changed. The study treated platform exposure and user emotion as measurable and experimentally adjustable data.",
    "links": [
      {
        "label": "PNAS / PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/PMC4066473/"
      }
    ]
  },
  {
    "year": "2014",
    "title": "FTC Data Brokers Report",
    "description": "The FTC investigated nine data brokers and reported that they collected, combined, analyzed and sold consumer information from many online and offline sources. The report described consumer segmentation and scoring practices that were often invisible to the people being categorized.",
    "image": {
      "src": "/assets/timeline/ftc-data-brokers-report.jpg",
      "alt": "A real image reference for the 2014 FTC data brokers report",
      "tone": "law"
    },
    "links": [
      {
        "label": "FTC report",
        "url": "https://www.ftc.gov/reports/data-brokers-call-transparency-accountability-report-federal-trade-commission-may-2014"
      }
    ]
  },
  {
    "year": "2014",
    "title": "China Social Credit System Planning Outline",
    "description": "China's State Council issued the Planning Outline for the Construction of a Social Credit System. The document proposed integrating government, commercial, social and judicial credit information into a broad framework for creditworthiness and trust-related governance.",
    "links": [
      {
        "label": "Stanford DigiChina translation",
        "url": "https://digichina.stanford.edu/work/planning-outline-for-the-construction-of-a-social-credit-system-2014-2020/"
      }
    ]
  },
  {
    "year": "2015",
    "title": "Ashley Madison Data Breach",
    "description": "Ashley Madison was hacked and account, profile, billing and security information for about 36 million users was published. The breach exposed intimate and relationship-related data connected to identifiable accounts.",
    "image": {
      "src": "/assets/timeline/ashley-madison-data-breach.jpg",
      "alt": "A real image reference for the Ashley Madison data breach and FTC settlement",
      "tone": "breach"
    },
    "links": [
      {
        "label": "FTC settlement",
        "url": "https://www.ftc.gov/news-events/news/press-releases/2016/12/operators-ashleymadisoncom-settle-ftc-state-charges-resulting-2015-data-breach-exposed-36-million"
      }
    ]
  },
  {
    "year": "2015",
    "title": "Obfuscation: A User’s Guide for Privacy and Protest",
    "description": "Finn Brunton and Helen Nissenbaum published *Obfuscation: A User's Guide for Privacy and Protest*, describing obfuscation as the deliberate production of misleading, ambiguous or confusing information to interfere with data collection and profiling.",
    "image": {
      "src": "/assets/timeline/obfuscation-book-cover.jpg",
      "alt": "The book cover for Obfuscation: A User's Guide for Privacy and Protest",
      "tone": "book"
    },
    "links": [
      {
        "label": "MIT Press",
        "url": "https://mitpress.mit.edu/9780262331326/obfuscation/"
      }
    ]
  },
  {
    "year": "2016",
    "title": "COMPAS / Machine Bias",
    "description": "ProPublica analyzed COMPAS, a criminal justice risk assessment tool used to estimate recidivism risk. The investigation reported racial disparities in false positive and false negative rates, making risk scoring and automated prediction a public controversy.",
    "image": {
      "src": "/assets/timeline/compas-machine-bias.jpg",
      "alt": "A real image reference for the COMPAS machine bias investigation",
      "tone": "law"
    },
    "links": [
      {
        "label": "ProPublica",
        "url": "https://www.propublica.org/article/machine-bias-risk-assessments-in-criminal-sentencing"
      }
    ]
  },
  {
    "year": "2017",
    "title": "Equifax Data Breach",
    "description": "Equifax announced a breach affecting about 147 million people. The exposed information included names, birth dates, addresses, Social Security numbers and other credit-reporting data central to identity verification and financial risk assessment.",
    "links": [
      {
        "label": "FTC settlement",
        "url": "https://www.ftc.gov/node/47878"
      }
    ]
  },
  {
    "year": "2018",
    "title": "GDPR Begins to Apply",
    "description": "The General Data Protection Regulation began to apply in the European Union on 25 May 2018. It established a legal framework for personal data processing, data-subject rights, consent, access, erasure, portability and compliance obligations.",
    "image": {
      "src": "/assets/timeline/gdpr-regulation-document.jpg",
      "alt": "A real document image reference for the General Data Protection Regulation",
      "tone": "law"
    },
    "links": [
      {
        "label": "European Commission",
        "url": "https://commission.europa.eu/law/law-topic/data-protection/legal-framework-eu-data-protection_en"
      }
    ]
  },
  {
    "year": "2018",
    "title": "Facebook–Cambridge Analytica",
    "description": "Cambridge Analytica obtained personal information from tens of millions of Facebook users through the Facebook app ecosystem. The FTC stated that the data was used for voter profiling, microtargeting and political campaign services.",
    "image": {
      "src": "/assets/timeline/cambridge-analytica-protest.jpg",
      "alt": "A real image reference for the Facebook Cambridge Analytica political data scandal",
      "tone": "protest"
    },
    "links": [
      {
        "label": "FTC complaint / settlement",
        "url": "https://www.ftc.gov/news-events/news/press-releases/2019/07/ftc-sues-cambridge-analytica-settles-former-ceo-app-developer"
      }
    ]
  },
  {
    "year": "2018",
    "title": "Strava Heatmap",
    "description": "Strava published a global heatmap of aggregated activity data from fitness tracking. Journalists and analysts reported that the map revealed military bases and personnel movement patterns in sensitive locations.",
    "links": [
      {
        "label": "Wired",
        "url": "https://www.wired.com/story/strava-military-bases-area-51-map-afghanistan-gchq-military/"
      }
    ]
  },
  {
    "year": "2020-2022",
    "title": "Clearview AI",
    "description": "Clearview AI built a facial recognition database using images scraped from the internet and social media. Regulators and civil-rights groups challenged the company over biometric data collection and face-recognition deployment.",
    "links": [
      {
        "label": "ACLU case",
        "url": "https://www.aclu.org/cases/aclu-v-clearview-ai"
      }
    ]
  },
  {
    "year": "2022",
    "title": "FTC v. Kochava",
    "description": "The FTC sued Kochava, alleging that the company sold precise mobile location data that could be used to trace people to sensitive places such as reproductive health clinics, places of worship, shelters and addiction recovery facilities.",
    "links": [
      {
        "label": "FTC press release",
        "url": "https://www.ftc.gov/news-events/news/press-releases/2022/08/ftc-sues-kochava-selling-data-tracks-people-reproductive-health-clinics-places-worship-other"
      }
    ]
  },
  {
    "year": "2023",
    "title": "23andMe Data Breach",
    "description": "23andMe confirmed that attackers accessed data affecting millions of users, including ancestry information and DNA relatives profile information. The incident showed how genetic and family-network data can extend privacy risk beyond one individual.",
    "links": [
      {
        "label": "TechCrunch",
        "url": "https://techcrunch.com/2023/12/04/23andme-confirms-hackers-stole-ancestry-data-on-6-9-million-users/"
      }
    ]
  },
  {
    "year": "2023",
    "title": "NHS Federated Data Platform / Palantir",
    "description": "NHS England awarded the Federated Data Platform contract to a consortium led by Palantir. The platform is intended to connect operational health data across NHS systems; the contract generated public discussion about health data infrastructure, privacy and private-sector involvement.",
    "links": [
      {
        "label": "NHS England update",
        "url": "https://www.england.nhs.uk/long-read/federated-data-platform-update/"
      }
    ]
  },
  {
    "year": "2024",
    "title": "EU AI Act",
    "description": "The EU AI Act entered into force, creating a risk-based regulatory framework for AI systems. It covers prohibited practices, high-risk systems, biometrics, transparency duties, governance requirements and enforcement mechanisms.",
    "image": {
      "src": "/assets/timeline/eu-ai-act.jpg",
      "alt": "A real image reference for the EU AI Act entering into force",
      "tone": "law"
    },
    "links": [
      {
        "label": "European Commission",
        "url": "https://commission.europa.eu/news/ai-act-enters-force-2024-08-01_en"
      }
    ]
  }
];
