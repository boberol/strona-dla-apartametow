import type { Locale } from "@/site/schema";

/*
 * The owner's guide to editing a guest site, shown at /[locale]/dashboard/guide.
 *
 * Long-form text lives here rather than in messages/*.json: it is prose, not
 * UI strings. Every language must have the same section ids in the same order
 * (guide.test.ts checks), because the editor links to sections by id.
 *
 * Inline markup: **bold** for the name of something on screen, `code` for
 * text the owner types literally.
 */

export type GuideBlock =
  | { p: string }
  | { list: string[] }
  | { steps: string[] }
  | { check: string[] }
  | { tip: string };

export type GuideSection = { id: string; title: string; blocks: GuideBlock[] };

export type Guide = {
  title: string;
  intro: string;
  contents: string;
  tip: string;
  sections: GuideSection[];
};

const en: Guide = {
  title: "How to edit your guest site",
  intro: "Everything you need to build and look after your guide, in about five minutes of reading.",
  contents: "On this page",
  tip: "Tip",
  sections: [
    {
      id: "basics",
      title: "How your guest site works",
      blocks: [
        {
          p: "Your guest site is a grid of **tiles**. Guests reach it by scanning the QR code in your apartment, with nothing to install. Each tile is one of four things:",
        },
        {
          list: [
            "**Content page**: text, photos, a map, Wi-Fi details and more, built from blocks.",
            "**Group of tiles**: opens another grid, for example \"Kitchen\" with tiles for the oven, the dishwasher and the coffee machine.",
            "**External link**: opens another website, such as a restaurant or your review page.",
            "**Report a problem**: a form where guests describe an issue and add photos. Reports arrive under **Reports**.",
          ],
        },
      ],
    },
    {
      id: "editor",
      title: "The editor at a glance",
      blocks: [
        { p: "Open it from **My apartments** with **Edit site**. It has three parts:" },
        {
          list: [
            "**Left**: your tiles (**Structure**), the look of the site (**Design**) and earlier versions (**History**).",
            "**Middle**: a phone preview. It is the real guest site, so what you see is exactly what guests get.",
            "**Right**: everything about the tile you selected.",
          ],
        },
        { tip: "The preview refreshes a moment after you stop typing, as soon as the change is saved." },
      ],
    },
    {
      id: "tiles",
      title: "Tiles: add, rename, reorder",
      blocks: [
        {
          steps: [
            "Click a tile in **Structure** to select it.",
            "Change its **Label** and **Icon** on the right. Search icons in English: `wifi`, `parking`, `key`.",
            "Use the toolbar above the fields to move it **up** or **down**, **nest** it under the tile above, **move it out** of a group, **duplicate** or **delete** it.",
          ],
        },
        {
          p: "**Add tile** at the bottom of the list adds a new content page. To put tiles inside a group, select the group and press **Add a tile inside**.",
        },
        {
          p: "Under **Settings** you can change a tile's **Type**, its part of the page address, or hide it from guests while you work on it. Hidden tiles are marked with a crossed-out eye.",
        },
      ],
    },
    {
      id: "content",
      title: "Writing a page with blocks",
      blocks: [
        {
          p: "A content page is a stack of **blocks**. Select the tile, press **Add block** and choose one. Click a block's name to open or fold it; the arrows change its order.",
        },
        {
          list: [
            "**Text**: paragraphs and lists. Write `**bold**`, `*italic*`, `[link text](https://...)`, and start a line with `- ` for a bullet point.",
            "**Details list**: pairs such as network and password, or door and code. Switch on **Let guests copy it** and guests copy the password with one tap.",
            "**Map**: an address with an **Open in Maps** button.",
            "**Button**: a large link, for example to book a table or leave a review.",
            "**Questions**: short questions whose answers fold out.",
            "**Contact**: phone, WhatsApp and email buttons.",
            "**Image**, **Gallery** and **Video** (YouTube), plus **Heading** and **Divider** to give a long page some structure.",
          ],
        },
        { tip: "A tile can also have a **Header image**: a wide photo at the top of its page." },
      ],
    },
    {
      id: "design",
      title: "Colours, fonts and photos",
      blocks: [
        { p: "Open **Design** in the left panel. Everything here applies to the whole site." },
        {
          list: [
            "**Colours**: the header, the accent used for links and buttons, the tiles, and the card behind page content.",
            "**Tiles and text**: solid, frosted or outline tiles, the font, and how rounded the corners are.",
            "**Background**: a photo behind the tile grid, and how much to darken it so the tiles stay readable.",
            "**Header**: your logo, or your name if you have no logo, and whether guests see the language switcher.",
          ],
        },
        {
          tip: "Frosted tiles look best over a photo. Keep text and tile colours in strong contrast: guests often read on a phone outdoors.",
        },
      ],
    },
    {
      id: "languages",
      title: "Languages",
      blocks: [
        { p: "Choose the languages guests can use, and the default one, under **Design** → **Published languages**." },
        {
          p: "The **EN / ES / PL** switch at the top of the editor is the language you are editing. Every text field is separate per language, and an empty one shows **Not translated**.",
        },
        {
          p: "An empty field falls back to your default language, so a half-translated site never shows blank tiles. Guests start in their phone's language whenever you publish it.",
        },
      ],
    },
    {
      id: "publish",
      title: "Saving, previewing and publishing",
      blocks: [
        {
          list: [
            "**Saving is automatic.** The dot next to the apartment's name says **All changes saved**.",
            "**Guests see nothing until you press Publish.** You can work on a new section for days while the live site stays as it was.",
            "The editor's preview shows your unpublished draft, marked with a yellow bar.",
            "When everything is live, the button reads **Published**.",
          ],
        },
        { tip: "Door codes and passwords in a draft stay private: only you can open the preview." },
      ],
    },
    {
      id: "history",
      title: "Undoing a publish",
      blocks: [
        {
          p: "Every publish is kept. Open **History** in the left panel, pick a version and press **Restore**. It becomes your draft: check it in the preview, then **Publish** to make it live again.",
        },
      ],
    },
    {
      id: "qr",
      title: "Your QR code",
      blocks: [
        {
          p: "In **My apartments**, press **QR code** for a printable card with your apartment's name and a short prompt in every language you publish. Print it, or download the code as PNG or SVG for your own design.",
        },
        {
          p: "The code never changes. Renaming the apartment, changing its address in the apartment's settings (the gear icon) or editing the guide never means reprinting.",
        },
        {
          tip: "Put the card where guests look first: by the door, on the fridge or next to the router. Send the permanent link in your booking messages too.",
        },
      ],
    },
    {
      id: "reports",
      title: "When a guest reports a problem",
      blocks: [
        {
          p: "Reports from the **Report a problem** tile appear under **Reports** with any photos and the language the guest wrote in, and you get an email. Press **Mark resolved** once it is dealt with.",
        },
      ],
    },
    {
      id: "checklist",
      title: "What to put in your guide",
      blocks: [
        {
          check: [
            "Wi-Fi network and password, in a details list guests can copy",
            "Arrival: address, how to get in, the door or key-box code, parking",
            "House rules: quiet hours, smoking, pets, rubbish and recycling",
            "Appliances: heating, air conditioning, washing machine, TV",
            "Check-out: the time, where the keys go, what to do before leaving",
            "Local tips: restaurants, shops, beaches, transport",
            "Emergency numbers and how to reach you",
          ],
        },
      ],
    },
  ],
};

const es: Guide = {
  title: "Cómo editar tu sitio para huéspedes",
  intro: "Todo lo que necesitas para crear y mantener tu guía, en unos cinco minutos de lectura.",
  contents: "En esta página",
  tip: "Consejo",
  sections: [
    {
      id: "basics",
      title: "Cómo funciona tu sitio",
      blocks: [
        {
          p: "Tu sitio para huéspedes es una cuadrícula de **elementos**. Los huéspedes llegan escaneando el código QR del apartamento, sin instalar nada. Cada elemento es una de estas cuatro cosas:",
        },
        {
          list: [
            "**Página de contenido**: texto, fotos, un mapa, los datos del Wi-Fi y más, hecha con bloques.",
            "**Grupo de elementos**: abre otra cuadrícula, por ejemplo \"Cocina\" con elementos para el horno, el lavavajillas y la cafetera.",
            "**Enlace externo**: abre otra web, como un restaurante o tu página de reseñas.",
            "**Informar de un problema**: un formulario donde el huésped describe el problema y añade fotos. Los avisos llegan a **Avisos**.",
          ],
        },
      ],
    },
    {
      id: "editor",
      title: "El editor de un vistazo",
      blocks: [
        { p: "Ábrelo desde **Mis apartamentos** con **Editar sitio**. Tiene tres partes:" },
        {
          list: [
            "**Izquierda**: tus elementos (**Estructura**), el aspecto del sitio (**Diseño**) y las versiones anteriores (**Historial**).",
            "**Centro**: la vista previa en un teléfono. Es el sitio real, así que lo que ves es exactamente lo que ven los huéspedes.",
            "**Derecha**: todo sobre el elemento seleccionado.",
          ],
        },
        { tip: "La vista previa se actualiza un momento después de que dejes de escribir, en cuanto se guarda el cambio." },
      ],
    },
    {
      id: "tiles",
      title: "Elementos: añadir, renombrar, ordenar",
      blocks: [
        {
          steps: [
            "Haz clic en un elemento de **Estructura** para seleccionarlo.",
            "Cambia su **Nombre** y su **Icono** a la derecha. Busca iconos en inglés: `wifi`, `parking`, `key`.",
            "Con la barra sobre los campos puedes **subirlo** o **bajarlo**, **anidarlo** en el elemento anterior, **sacarlo del grupo**, **duplicarlo** o **eliminarlo**.",
          ],
        },
        {
          p: "**Añadir elemento**, al final de la lista, crea una página de contenido nueva. Para poner elementos dentro de un grupo, selecciona el grupo y pulsa **Añadir un elemento dentro**.",
        },
        {
          p: "En **Ajustes** puedes cambiar el **Tipo** del elemento, su parte de la dirección o esconderlo de los huéspedes mientras trabajas en él. Los elementos ocultos llevan un ojo tachado.",
        },
      ],
    },
    {
      id: "content",
      title: "Escribir una página con bloques",
      blocks: [
        {
          p: "Una página de contenido es una pila de **bloques**. Selecciona el elemento, pulsa **Añadir bloque** y elige uno. Haz clic en el nombre de un bloque para abrirlo o plegarlo; las flechas cambian su orden.",
        },
        {
          list: [
            "**Texto**: párrafos y listas. Escribe `**negrita**`, `*cursiva*`, `[texto del enlace](https://...)` y empieza una línea con `- ` para una viñeta.",
            "**Lista de datos**: pares como red y contraseña, o puerta y código. Activa **Permitir copiar** y el huésped copia la contraseña con un toque.",
            "**Mapa**: una dirección con el botón **Abrir en Mapas**.",
            "**Botón**: un enlace grande, por ejemplo para reservar mesa o dejar una reseña.",
            "**Preguntas**: preguntas cortas cuyas respuestas se despliegan.",
            "**Contacto**: botones de teléfono, WhatsApp y correo.",
            "**Imagen**, **Galería** y **Vídeo** (YouTube), además de **Título** y **Separador** para ordenar una página larga.",
          ],
        },
        { tip: "Cada elemento puede tener también una **Imagen de cabecera**: una foto ancha en la parte superior de su página." },
      ],
    },
    {
      id: "design",
      title: "Colores, tipografía y fotos",
      blocks: [
        { p: "Abre **Diseño** en el panel izquierdo. Todo lo que cambies aquí se aplica a todo el sitio." },
        {
          list: [
            "**Colores**: la cabecera, el color de acento de enlaces y botones, los elementos y la tarjeta detrás del contenido.",
            "**Elementos y texto**: elementos sólidos, esmerilados o de contorno, la tipografía y lo redondeadas que son las esquinas.",
            "**Fondo**: una foto detrás de la cuadrícula y cuánto oscurecerla para que los elementos se lean bien.",
            "**Cabecera**: tu logotipo, o tu nombre si no tienes logotipo, y si los huéspedes ven el selector de idioma.",
          ],
        },
        {
          tip: "Los elementos esmerilados quedan mejor sobre una foto. Mantén un buen contraste entre texto y elementos: los huéspedes suelen leer en el móvil al aire libre.",
        },
      ],
    },
    {
      id: "languages",
      title: "Idiomas",
      blocks: [
        { p: "Elige los idiomas que pueden usar los huéspedes, y el predeterminado, en **Diseño** → **Idiomas publicados**." },
        {
          p: "El selector **EN / ES / PL** de la parte superior del editor es el idioma que estás editando. Cada campo de texto es independiente por idioma, y uno vacío muestra **Sin traducir**.",
        },
        {
          p: "Un campo vacío usa tu idioma predeterminado, así que un sitio a medio traducir nunca muestra elementos en blanco. Los huéspedes entran en el idioma de su teléfono si lo publicas.",
        },
      ],
    },
    {
      id: "publish",
      title: "Guardar, previsualizar y publicar",
      blocks: [
        {
          list: [
            "**Todo se guarda solo.** El punto junto al nombre del apartamento indica **Todo guardado**.",
            "**Los huéspedes no ven nada hasta que pulsas Publicar.** Puedes trabajar días en una sección nueva mientras el sitio publicado sigue igual.",
            "La vista previa del editor muestra tu borrador sin publicar, marcado con una barra amarilla.",
            "Cuando todo está publicado, el botón indica **Publicado**.",
          ],
        },
        { tip: "Los códigos de puerta y las contraseñas de un borrador son privados: solo tú puedes abrir la vista previa." },
      ],
    },
    {
      id: "history",
      title: "Deshacer una publicación",
      blocks: [
        {
          p: "Cada publicación se guarda. Abre **Historial** en el panel izquierdo, elige una versión y pulsa **Restaurar**. Se convierte en tu borrador: revísalo en la vista previa y pulsa **Publicar** para que vuelva a estar en línea.",
        },
      ],
    },
    {
      id: "qr",
      title: "Tu código QR",
      blocks: [
        {
          p: "En **Mis apartamentos**, pulsa **Código QR** para ver una tarjeta imprimible con el nombre del apartamento y un breve texto en cada idioma que publicas. Imprímela, o descarga el código en PNG o SVG para tu propio diseño.",
        },
        {
          p: "El código nunca cambia. Renombrar el apartamento, cambiar su dirección en los ajustes del apartamento (el icono del engranaje) o editar la guía nunca obliga a reimprimir.",
        },
        {
          tip: "Pon la tarjeta donde los huéspedes miran primero: junto a la puerta, en la nevera o al lado del router. Envía también el enlace permanente en los mensajes de la reserva.",
        },
      ],
    },
    {
      id: "reports",
      title: "Cuando un huésped avisa de un problema",
      blocks: [
        {
          p: "Los avisos del elemento **Informar de un problema** aparecen en **Avisos** con las fotos y el idioma en que escribió el huésped, y además recibes un correo. Pulsa **Marcar como resuelto** cuando esté solucionado.",
        },
      ],
    },
    {
      id: "checklist",
      title: "Qué poner en tu guía",
      blocks: [
        {
          check: [
            "Red Wi-Fi y contraseña, en una lista de datos que se pueda copiar",
            "Llegada: dirección, cómo entrar, el código de la puerta o del cajetín, aparcamiento",
            "Normas de la casa: horas de silencio, tabaco, mascotas, basura y reciclaje",
            "Electrodomésticos: calefacción, aire acondicionado, lavadora, televisión",
            "Salida: la hora, dónde dejar las llaves, qué hacer antes de irse",
            "Recomendaciones: restaurantes, tiendas, playas, transporte",
            "Teléfonos de emergencia y cómo contactar contigo",
          ],
        },
      ],
    },
  ],
};

const pl: Guide = {
  title: "Jak edytować stronę dla gości",
  intro: "Wszystko, czego potrzebujesz, by zbudować i prowadzić swój przewodnik. Około pięciu minut czytania.",
  contents: "Na tej stronie",
  tip: "Wskazówka",
  sections: [
    {
      id: "basics",
      title: "Jak działa strona dla gości",
      blocks: [
        {
          p: "Strona dla gości to siatka **kafelków**. Goście trafiają na nią, skanując kod QR w apartamencie, bez instalowania czegokolwiek. Każdy kafelek jest jednym z czterech rodzajów:",
        },
        {
          list: [
            "**Strona z treścią**: tekst, zdjęcia, mapa, dane Wi-Fi i więcej, zbudowana z bloków.",
            "**Grupa kafelków**: otwiera kolejną siatkę, na przykład \"Kuchnia\" z kafelkami o piekarniku, zmywarce i ekspresie do kawy.",
            "**Link zewnętrzny**: otwiera inną stronę, np. restauracji albo Twoją stronę z opiniami.",
            "**Zgłoszenie usterki**: formularz, w którym gość opisuje problem i dodaje zdjęcia. Zgłoszenia trafiają do zakładki **Zgłoszenia**.",
          ],
        },
      ],
    },
    {
      id: "editor",
      title: "Edytor w skrócie",
      blocks: [
        { p: "Otwierasz go w **Moje apartamenty** przyciskiem **Edytuj stronę**. Składa się z trzech części:" },
        {
          list: [
            "**Po lewej**: Twoje kafelki (**Struktura**), wygląd strony (**Wygląd**) i wcześniejsze wersje (**Historia**).",
            "**Na środku**: podgląd w telefonie. To prawdziwa strona dla gości, więc widzisz dokładnie to, co oni.",
            "**Po prawej**: wszystko o zaznaczonym kafelku.",
          ],
        },
        { tip: "Podgląd odświeża się chwilę po tym, jak przestaniesz pisać, gdy tylko zmiana się zapisze." },
      ],
    },
    {
      id: "tiles",
      title: "Kafelki: dodawanie, nazwy, kolejność",
      blocks: [
        {
          steps: [
            "Kliknij kafelek w **Strukturze**, aby go zaznaczyć.",
            "Zmień jego **Nazwę** i **Ikonę** po prawej. Ikony wyszukuj po angielsku: `wifi`, `parking`, `key`.",
            "Paskiem nad polami przesuniesz go **w górę** lub **w dół**, **zagnieździsz** w kafelku powyżej, **wysuniesz** z grupy, **zduplikujesz** albo **usuniesz**.",
          ],
        },
        {
          p: "**Dodaj kafelek** na dole listy tworzy nową stronę z treścią. Aby dodać kafelki do grupy, zaznacz grupę i kliknij **Dodaj kafelek wewnątrz**.",
        },
        {
          p: "W **Ustawieniach** zmienisz **Typ** kafelka, jego fragment adresu albo ukryjesz go przed gośćmi na czas pracy. Ukryte kafelki mają ikonę przekreślonego oka.",
        },
      ],
    },
    {
      id: "content",
      title: "Pisanie strony z bloków",
      blocks: [
        {
          p: "Strona z treścią to stos **bloków**. Zaznacz kafelek, kliknij **Dodaj blok** i wybierz rodzaj. Kliknięcie nazwy bloku rozwija go lub zwija, a strzałki zmieniają kolejność.",
        },
        {
          list: [
            "**Tekst**: akapity i listy. Pisz `**pogrubienie**`, `*kursywa*`, `[tekst linku](https://...)`, a linię zacznij od `- `, by zrobić punkt listy.",
            "**Lista danych**: pary takie jak sieć i hasło albo drzwi i kod. Włącz **Pozwól gościom kopiować**, a gość skopiuje hasło jednym dotknięciem.",
            "**Mapa**: adres z przyciskiem **Otwórz w mapach**.",
            "**Przycisk**: duży link, np. do rezerwacji stolika albo wystawienia opinii.",
            "**Pytania**: krótkie pytania z rozwijanymi odpowiedziami.",
            "**Kontakt**: przyciski telefonu, WhatsAppa i e-maila.",
            "**Zdjęcie**, **Galeria** i **Wideo** (YouTube), a także **Nagłówek** i **Separator**, by uporządkować długą stronę.",
          ],
        },
        { tip: "Każdy kafelek może mieć też **Zdjęcie nagłówka**: szerokie zdjęcie na górze swojej strony." },
      ],
    },
    {
      id: "design",
      title: "Kolory, czcionki i zdjęcia",
      blocks: [
        { p: "Otwórz **Wygląd** w lewym panelu. Wszystko tutaj dotyczy całej strony." },
        {
          list: [
            "**Kolory**: nagłówek, kolor akcentu dla linków i przycisków, kafelki oraz karta pod treścią stron.",
            "**Kafelki i tekst**: kafelki pełne, matowe lub z obrysem, czcionka i zaokrąglenie rogów.",
            "**Tło**: zdjęcie pod siatką kafelków i to, jak mocno je przyciemnić, by kafelki były czytelne.",
            "**Nagłówek**: Twoje logo albo nazwa, jeśli logo nie masz, oraz to, czy goście widzą przełącznik języka.",
          ],
        },
        {
          tip: "Matowe kafelki najlepiej wyglądają na zdjęciu. Dbaj o mocny kontrast tekstu i kafelków: goście często czytają na telefonie na zewnątrz.",
        },
      ],
    },
    {
      id: "languages",
      title: "Języki",
      blocks: [
        { p: "Języki dostępne dla gości i język domyślny wybierasz w **Wygląd** → **Publikowane języki**." },
        {
          p: "Przełącznik **EN / ES / PL** na górze edytora to język, który właśnie edytujesz. Każde pole tekstowe jest osobne dla każdego języka, a puste pokazuje **Brak tłumaczenia**.",
        },
        {
          p: "Puste pole zastępuje język domyślny, więc częściowo przetłumaczona strona nigdy nie pokaże pustych kafelków. Goście trafiają na język swojego telefonu, jeśli go opublikujesz.",
        },
      ],
    },
    {
      id: "publish",
      title: "Zapisywanie, podgląd i publikacja",
      blocks: [
        {
          list: [
            "**Zapis jest automatyczny.** Kropka obok nazwy apartamentu pokazuje **Wszystko zapisane**.",
            "**Goście nie widzą zmian, dopóki nie klikniesz Opublikuj.** Możesz pracować nad nową sekcją całymi dniami, a opublikowana strona pozostaje bez zmian.",
            "Podgląd w edytorze pokazuje nieopublikowany szkic, oznaczony żółtym paskiem.",
            "Gdy wszystko jest opublikowane, przycisk pokazuje **Opublikowano**.",
          ],
        },
        { tip: "Kody do drzwi i hasła w szkicu są prywatne: tylko Ty możesz otworzyć podgląd." },
      ],
    },
    {
      id: "history",
      title: "Cofanie publikacji",
      blocks: [
        {
          p: "Każda publikacja jest zachowywana. Otwórz **Historię** w lewym panelu, wybierz wersję i kliknij **Przywróć**. Stanie się ona Twoim szkicem: sprawdź ją w podglądzie i kliknij **Opublikuj**, aby znów była widoczna dla gości.",
        },
      ],
    },
    {
      id: "qr",
      title: "Twój kod QR",
      blocks: [
        {
          p: "W **Moje apartamenty** kliknij **Kod QR**, aby otworzyć kartę do druku z nazwą apartamentu i krótkim zaproszeniem w każdym publikowanym języku. Wydrukuj ją albo pobierz sam kod jako PNG lub SVG do własnego projektu.",
        },
        {
          p: "Kod nigdy się nie zmienia. Zmiana nazwy apartamentu, jego adresu w ustawieniach apartamentu (ikona koła zębatego) czy edycja przewodnika nie wymagają ponownego drukowania.",
        },
        {
          tip: "Umieść kartę tam, gdzie goście patrzą najpierw: przy drzwiach, na lodówce albo obok routera. Wysyłaj też stały link w wiadomościach o rezerwacji.",
        },
      ],
    },
    {
      id: "reports",
      title: "Gdy gość zgłosi problem",
      blocks: [
        {
          p: "Zgłoszenia z kafelka **Zgłoszenie usterki** trafiają do zakładki **Zgłoszenia** razem ze zdjęciami i językiem, w którym pisał gość, a Ty dostajesz e-mail. Kliknij **Oznacz jako rozwiązane**, gdy sprawa jest załatwiona.",
        },
      ],
    },
    {
      id: "checklist",
      title: "Co umieścić w przewodniku",
      blocks: [
        {
          check: [
            "Nazwę sieci Wi-Fi i hasło, w liście danych do skopiowania",
            "Przyjazd: adres, jak wejść, kod do drzwi lub skrytki na klucze, parking",
            "Zasady domu: cisza nocna, palenie, zwierzęta, śmieci i segregacja",
            "Urządzenia: ogrzewanie, klimatyzacja, pralka, telewizor",
            "Wyjazd: godzina, gdzie zostawić klucze, co zrobić przed wyjściem",
            "Polecane miejsca: restauracje, sklepy, plaże, dojazd",
            "Numery alarmowe i jak się z Tobą skontaktować",
          ],
        },
      ],
    },
  ],
};

export const GUIDE: Record<Locale, Guide> = { en, es, pl };
