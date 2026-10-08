import { newId } from "./factories";
import type { Block, L10nString, SiteDoc, Theme, Tile, TileKind } from "./schema";

/*
 * Starter templates offered during onboarding.
 *
 * A template is just a SiteDoc, so "use this template" is a plain copy and the
 * owner can change anything afterwards. Content is written in all three
 * languages so a new site is never half-empty in the guest's language.
 */

export const TEMPLATE_IDS = ["general", "cabin", "hotel"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const isTemplateId = (value: unknown): value is TemplateId =>
  typeof value === "string" && (TEMPLATE_IDS as readonly string[]).includes(value);

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

type TileInit = {
  slug: string;
  icon: string;
  label: L10nString;
  kind?: TileKind;
  children?: Tile[];
  blocks?: Block[];
  href?: string | null;
};

const tile = (init: TileInit): Tile => ({
  id: newId(),
  slug: init.slug,
  icon: init.icon,
  label: init.label,
  kind: init.kind ?? "content",
  hidden: false,
  heroImageUrl: null,
  children: init.children ?? [],
  blocks: init.blocks ?? [],
  href: init.href ?? null,
});

const text = (value: L10nString): Block => ({ id: newId(), type: "richText", text: value });

const heading = (value: L10nString): Block => ({
  id: newId(),
  type: "heading",
  text: value,
  level: 2,
  align: "left",
});

const details = (
  items: { label: L10nString; value: string; copyable?: boolean }[],
): Block => ({
  id: newId(),
  type: "keyValue",
  items: items.map((item) => ({
    label: item.label,
    value: item.value,
    copyable: item.copyable ?? true,
  })),
});

/* ------------------------------------------------------------------ */
/* Shared tiles                                                        */
/* ------------------------------------------------------------------ */

const wifiTile = (network: string, password: string) =>
  tile({
    slug: "wifi",
    icon: "tabler:wifi",
    label: { en: "Wi-Fi", es: "Wi-Fi", pl: "Wi-Fi" },
    blocks: [
      text({
        en: "Free Wi-Fi throughout. Tap the button to copy the password.",
        es: "Wi-Fi gratuito en todo el alojamiento. Toca el botón para copiar la contraseña.",
        pl: "Bezpłatne Wi-Fi w całym obiekcie. Dotknij przycisku, aby skopiować hasło.",
      }),
      details([
        { label: { en: "Network", es: "Red", pl: "Sieć" }, value: network },
        { label: { en: "Password", es: "Contraseña", pl: "Hasło" }, value: password },
      ]),
    ],
  });

const reportTile = () =>
  tile({
    slug: "report-issue",
    icon: "tabler:alert-triangle",
    label: {
      en: "Report an issue",
      es: "Informar de un problema",
      pl: "Zgłoś usterkę",
    },
    kind: "issue-form",
  });

const reviewsTile = () =>
  tile({
    slug: "reviews",
    icon: "tabler:star",
    label: { en: "Leave a review", es: "Deja una reseña", pl: "Zostaw opinię" },
    kind: "link",
    href: "https://www.google.com/maps",
  });

const helpTile = () =>
  tile({
    slug: "help",
    icon: "tabler:report-medical",
    label: {
      en: "Help & safety",
      es: "Ayuda y seguridad",
      pl: "Pomoc i bezpieczeństwo",
    },
    blocks: [
      {
        id: newId(),
        type: "contact",
        phone: "+48000000000",
        whatsapp: "+48000000000",
        email: "host@example.com",
        note: {
          en: "We are usually nearby and answer quickly.",
          es: "Normalmente estamos cerca y respondemos rápido.",
          pl: "Zwykle jesteśmy w pobliżu i odpowiadamy szybko.",
        },
      },
      details([
        {
          label: { en: "Emergency number", es: "Número de emergencia", pl: "Numer alarmowy" },
          value: "112",
          copyable: false,
        },
      ]),
    ],
  });

const houseRulesTile = (quietFrom: string, quietTo: string) =>
  tile({
    slug: "house-rules",
    icon: "carbon:policy",
    label: { en: "House rules", es: "Normas de la casa", pl: "Regulamin" },
    blocks: [
      text({
        en: `We keep the rules short.\n\n- Quiet hours are between **${quietFrom} and ${quietTo}**\n- Smoking is not allowed inside\n- Please let us know in advance if you bring a pet`,
        es: `Las normas son breves.\n\n- El horario de silencio es de **${quietFrom} a ${quietTo}**\n- No se permite fumar en el interior\n- Avísanos con antelación si traes una mascota`,
        pl: `Zasady są krótkie.\n\n- Cisza nocna obowiązuje od **${quietFrom} do ${quietTo}**\n- Palenie w środku jest zabronione\n- Prosimy o wcześniejszą informację, jeśli przyjeżdżasz ze zwierzęciem`,
      }),
    ],
  });

const checkOutTile = (time: string) =>
  tile({
    slug: "check-out",
    icon: "tabler:logout",
    label: { en: "Check-out", es: "Salida", pl: "Wymeldowanie" },
    blocks: [
      text({
        en: `Check-out is until **${time}**.\n\nBefore you leave:\n\n- Take the rubbish outside\n- Leave the keys where you found them\n- Close all the windows`,
        es: `La salida es hasta las **${time}**.\n\nAntes de irte:\n\n- Saca la basura\n- Deja las llaves donde las encontraste\n- Cierra todas las ventanas`,
        pl: `Wymeldowanie do **${time}**.\n\nZanim wyjedziesz:\n\n- Wynieś śmieci\n- Zostaw klucze tam, gdzie je zastałeś\n- Zamknij wszystkie okna`,
      }),
    ],
  });

const findUsTile = () =>
  tile({
    slug: "find-us",
    icon: "tabler:map-2",
    label: { en: "Find us", es: "Cómo llegar", pl: "Tu nas znajdziesz" },
    blocks: [
      {
        id: newId(),
        type: "map",
        address: {
          en: "Add your address here",
          es: "Añade aquí tu dirección",
          pl: "Dodaj tutaj swój adres",
        },
        query: "",
      },
    ],
  });

/* ------------------------------------------------------------------ */
/* Themes                                                              */
/* ------------------------------------------------------------------ */

const THEMES: Record<TemplateId, Theme> = {
  general: {
    brand: "#8a7350",
    accent: "#8a6d4a",
    tileBg: "#f2e7d5",
    tileText: "#2b2b2b",
    cardBg: "#ffffff",
    cardText: "#2b2b2b",
    font: "inter",
    radius: 22,
    tileStyle: "solid",
    overlay: 45,
  },
  cabin: {
    brand: "#3f5545",
    accent: "#5c7a63",
    tileBg: "#eae3d2",
    tileText: "#27301f",
    cardBg: "#fbf8f1",
    cardText: "#27301f",
    font: "lora",
    radius: 28,
    tileStyle: "solid",
    overlay: 50,
  },
  hotel: {
    brand: "#16243c",
    accent: "#b08d4f",
    tileBg: "#f6f7f9",
    tileText: "#16243c",
    cardBg: "#ffffff",
    cardText: "#1c2434",
    font: "playfair",
    radius: 12,
    tileStyle: "solid",
    overlay: 55,
  },
};

const BACKGROUND: Record<TemplateId, string> = {
  general: "#3a332c",
  cabin: "#232b22",
  hotel: "#101827",
};

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function generalTiles(): Tile[] {
  return [
    houseRulesTile("22:00", "07:00"),
    findUsTile(),
    tile({
      slug: "arrival",
      icon: "tabler:door-enter",
      label: { en: "Your arrival", es: "Tu llegada", pl: "Twój przyjazd" },
      kind: "section",
      children: [
        wifiTile("YourNetwork", "changeme"),
        tile({
          slug: "check-in",
          icon: "tabler:key",
          label: { en: "Check-in", es: "Entrada", pl: "Zameldowanie" },
          blocks: [
            text({
              en: "Check-in is from **16:00**. The key box is next to the front door.",
              es: "La entrada es a partir de las **16:00**. La caja de llaves está junto a la puerta.",
              pl: "Zameldowanie od **16:00**. Skrzynka na klucze jest obok drzwi wejściowych.",
            }),
            details([
              {
                label: { en: "Key box code", es: "Código de la caja", pl: "Kod skrzynki" },
                value: "0000",
              },
            ]),
          ],
        }),
        tile({
          slug: "parking",
          icon: "tabler:parking",
          label: { en: "Parking", es: "Aparcamiento", pl: "Parking" },
          blocks: [
            text({
              en: "Your parking space is in front of the building.",
              es: "Tu plaza de aparcamiento está delante del edificio.",
              pl: "Twoje miejsce parkingowe znajduje się przed budynkiem.",
            }),
          ],
        }),
      ],
    }),
    tile({
      slug: "recommendations",
      icon: "tabler:message-2-star",
      label: {
        en: "Our recommendations",
        es: "Nuestras recomendaciones",
        pl: "Nasze polecenia",
      },
      blocks: [
        heading({ en: "Where to eat", es: "Dónde comer", pl: "Gdzie zjeść" }),
        text({
          en: "- Add your favourite restaurant\n- And another one",
          es: "- Añade tu restaurante favorito\n- Y otro más",
          pl: "- Dodaj swoją ulubioną restaurację\n- I jeszcze jedną",
        }),
      ],
    }),
    checkOutTile("11:00"),
    helpTile(),
    reportTile(),
    reviewsTile(),
  ];
}

function cabinTiles(): Tile[] {
  return [
    houseRulesTile("22:00", "08:00"),
    findUsTile(),
    tile({
      slug: "arrival",
      icon: "tabler:door-enter",
      label: { en: "Your arrival", es: "Tu llegada", pl: "Twój przyjazd" },
      kind: "section",
      children: [
        wifiTile("CabinWifi", "changeme"),
        tile({
          slug: "check-in",
          icon: "tabler:key",
          label: { en: "Check-in", es: "Entrada", pl: "Zameldowanie" },
          blocks: [
            text({
              en: "Check-in is from **16:00**. The cabin key is in the lock box on the porch.",
              es: "La entrada es a partir de las **16:00**. La llave está en la caja del porche.",
              pl: "Zameldowanie od **16:00**. Klucz do domku jest w skrzynce na ganku.",
            }),
            details([
              {
                label: { en: "Lock box code", es: "Código de la caja", pl: "Kod skrzynki" },
                value: "0000",
              },
            ]),
          ],
        }),
      ],
    }),
    tile({
      slug: "fireplace",
      icon: "tabler:flame",
      label: { en: "Fireplace & firewood", es: "Chimenea y leña", pl: "Kominek i drewno" },
      blocks: [
        text({
          en: "Firewood is in the shed behind the cabin and is included in your stay.\n\nOpen the flue **before** lighting the fire, and never leave it burning overnight.",
          es: "La leña está en el cobertizo detrás de la cabaña y está incluida en tu estancia.\n\nAbre el tiro **antes** de encender el fuego y nunca lo dejes encendido por la noche.",
          pl: "Drewno znajduje się w wiacie za domkiem i jest wliczone w pobyt.\n\nOtwórz szyber **przed** rozpaleniem ognia i nigdy nie zostawiaj go na noc.",
        }),
      ],
    }),
    tile({
      slug: "sauna-hot-tub",
      icon: "tabler:bath",
      label: { en: "Sauna & hot tub", es: "Sauna y jacuzzi", pl: "Sauna i balia" },
      blocks: [
        text({
          en: "The sauna heats up in about 30 minutes. Please use a towel on the benches and switch the heater off when you are done.",
          es: "La sauna se calienta en unos 30 minutos. Usa una toalla en los bancos y apaga el calentador al terminar.",
          pl: "Sauna nagrzewa się około 30 minut. Prosimy o używanie ręcznika na ławkach i wyłączenie pieca po zakończeniu.",
        }),
        {
          id: newId(),
          type: "faq",
          items: [
            {
              q: {
                en: "Can we use it at night?",
                es: "¿Podemos usarla de noche?",
                pl: "Czy możemy korzystać w nocy?",
              },
              a: {
                en: "Until 22:00, then please keep the terrace quiet.",
                es: "Hasta las 22:00; después, mantén la terraza en silencio.",
                pl: "Do 22:00, potem prosimy o ciszę na tarasie.",
              },
            },
          ],
        },
      ],
    }),
    tile({
      slug: "nature",
      icon: "tabler:tree",
      label: { en: "Walks & nature", es: "Paseos y naturaleza", pl: "Spacery i przyroda" },
      blocks: [
        text({
          en: "- A marked trail starts at the end of the drive\n- The lake is a 15 minute walk\n- Please take your rubbish back with you",
          es: "- Un sendero señalizado empieza al final del camino\n- El lago está a 15 minutos a pie\n- Llévate tu basura de vuelta",
          pl: "- Oznakowany szlak zaczyna się na końcu drogi dojazdowej\n- Nad jezioro idzie się 15 minut\n- Prosimy o zabranie śmieci ze sobą",
        }),
      ],
    }),
    checkOutTile("11:00"),
    helpTile(),
    reportTile(),
    reviewsTile(),
  ];
}

function hotelTiles(): Tile[] {
  return [
    tile({
      slug: "reception",
      icon: "tabler:bell",
      label: { en: "Reception", es: "Recepción", pl: "Recepcja" },
      blocks: [
        text({
          en: "Reception is open **07:00 - 22:00**. Outside those hours call the number below and we will let you in.",
          es: "La recepción abre de **07:00 a 22:00**. Fuera de ese horario llama al número de abajo y te abriremos.",
          pl: "Recepcja czynna **07:00 - 22:00**. Poza tymi godzinami zadzwoń pod numer poniżej, a wpuścimy Cię.",
        }),
      ],
    }),
    houseRulesTile("22:00", "07:00"),
    findUsTile(),
    tile({
      slug: "stay",
      icon: "tabler:door-enter",
      label: { en: "Your stay", es: "Tu estancia", pl: "Twój pobyt" },
      kind: "section",
      children: [
        wifiTile("HotelGuest", "changeme"),
        tile({
          slug: "breakfast",
          icon: "tabler:coffee",
          label: { en: "Breakfast", es: "Desayuno", pl: "Śniadanie" },
          blocks: [
            text({
              en: "Breakfast is served in the dining room from **07:00 to 10:30**.",
              es: "El desayuno se sirve en el comedor de **07:00 a 10:30**.",
              pl: "Śniadanie podajemy w jadalni od **07:00 do 10:30**.",
            }),
          ],
        }),
        tile({
          slug: "parking",
          icon: "tabler:parking",
          label: { en: "Parking", es: "Aparcamiento", pl: "Parking" },
          blocks: [
            text({
              en: "Guest parking is behind the building. Ask reception for the gate code.",
              es: "El aparcamiento para huéspedes está detrás del edificio. Pide el código en recepción.",
              pl: "Parking dla gości znajduje się za budynkiem. Kod do bramy otrzymasz w recepcji.",
            }),
          ],
        }),
      ],
    }),
    tile({
      slug: "amenities",
      icon: "tabler:sparkles",
      label: { en: "Facilities", es: "Instalaciones", pl: "Udogodnienia" },
      blocks: [
        text({
          en: "- Fitness room on the ground floor, open 06:00 - 22:00\n- Laundry service, ask reception before 10:00\n- Luggage storage available after check-out",
          es: "- Gimnasio en la planta baja, abierto de 06:00 a 22:00\n- Servicio de lavandería, pídelo en recepción antes de las 10:00\n- Consigna disponible tras la salida",
          pl: "- Siłownia na parterze, czynna 06:00 - 22:00\n- Pralnia, zgłoś w recepcji przed 10:00\n- Przechowalnia bagażu dostępna po wymeldowaniu",
        }),
      ],
    }),
    checkOutTile("12:00"),
    helpTile(),
    reportTile(),
    reviewsTile(),
  ];
}

const TILE_BUILDERS: Record<TemplateId, () => Tile[]> = {
  general: generalTiles,
  cabin: cabinTiles,
  hotel: hotelTiles,
};

/** Template metadata for the onboarding picker. Labels come from messages. */
export const TEMPLATE_META: Record<TemplateId, { nameKey: string; descriptionKey: string }> = {
  general: { nameKey: "generalName", descriptionKey: "generalDescription" },
  cabin: { nameKey: "cabinName", descriptionKey: "cabinDescription" },
  hotel: { nameKey: "hotelName", descriptionKey: "hotelDescription" },
};

export function buildTemplate(id: TemplateId, propertyName: string): SiteDoc {
  return {
    version: 1,
    locales: ["en", "es", "pl"],
    defaultLocale: "en",
    theme: { ...THEMES[id] },
    background: { imageUrl: null, color: BACKGROUND[id] },
    header: {
      logoUrl: null,
      logoText: { en: propertyName, es: propertyName, pl: propertyName },
      showLanguageSwitcher: true,
    },
    tiles: TILE_BUILDERS[id](),
  };
}
