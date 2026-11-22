import { MegaCategory } from '../types/shop';

export const MEGA_CATEGORIES: MegaCategory[] = [
  {
    slug: 'cani',
    name: 'Cani',
    tagline: 'Riposo ortopedico, passeggiate sicure e gioco quotidiano',
    iconName: 'Dog',
    featuredProductId: 101,
    columns: [
      {
        heading: 'Riposo & Casa',
        links: [
          { label: 'Cucce e Letti', filterTerm: 'Cucce e Letti' },
          { label: 'Coperte Antistrappo', filterTerm: 'Cucce e Letti' },
          { label: 'Tappetini Rinfrescanti', filterTerm: 'Cucce e Letti' },
        ],
      },
      {
        heading: 'Passeggio & Stile',
        links: [
          { label: 'Guinzagli e Pettorine', filterTerm: 'Guinzagli e Pettorine' },
          { label: 'Abbigliamento', filterTerm: 'Abbigliamento' },
          { label: 'Collari Riflettenti', filterTerm: 'Guinzagli e Pettorine' },
        ],
      },
      {
        heading: 'Gioco & Pasti',
        links: [
          { label: 'Giochi Interattivi', filterTerm: 'Giochi Interattivi' },
          { label: 'Ciotole e Distributori', filterTerm: 'Ciotole e Distributori' },
          { label: 'Snack & Masticazione', filterTerm: 'Giochi Interattivi' },
        ],
      },
    ],
  },
  {
    slug: 'gatti',
    name: 'Gatti',
    tagline: 'Benessere verticale, idratazione silenziosa e gioco felino',
    iconName: 'Cat',
    featuredProductId: 103,
    columns: [
      {
        heading: 'Arrampicata & Relax',
        links: [
          { label: 'Tiragraffi e Alberi', filterTerm: 'Tiragraffi e Alberi' },
          { label: 'Cucce Morbide', filterTerm: 'Cucce Morbide' },
          { label: 'Amache da Finestra', filterTerm: 'Cucce Morbide' },
        ],
      },
      {
        heading: 'Igiene & Idratazione',
        links: [
          { label: 'Lettiere e Accessori', filterTerm: 'Lettiere e Accessori' },
          { label: 'Fontanelle Acqua', filterTerm: 'Fontanelle Acqua' },
          { label: 'Tappetini Cattura Sabbia', filterTerm: 'Lettiere e Accessori' },
        ],
      },
      {
        heading: 'Stimolo & Caccia',
        links: [
          { label: 'Giochi e Tunnel', filterTerm: 'Giochi e Tunnel' },
          { label: 'Bacchette con Piume', filterTerm: 'Giochi e Tunnel' },
          { label: 'Erba Gatta Bio', filterTerm: 'Giochi e Tunnel' },
        ],
      },
    ],
  },
  {
    slug: 'viaggio-trasporto',
    name: 'Viaggio & Trasporto',
    tagline: 'Spostamenti comodi in auto, treno o trekking',
    iconName: 'Luggage',
    featuredProductId: 106,
    columns: [
      {
        heading: 'Trasporto Ergonomico',
        links: [
          { label: 'Zaini Trasportini', filterTerm: 'Zaini Trasportini' },
          { label: 'Borse Passeggio', filterTerm: 'Borse Passeggio' },
          { label: 'Trolley Omologati', filterTerm: 'Zaini Trasportini' },
        ],
      },
      {
        heading: 'Protezione Auto',
        links: [
          { label: 'Coprisedili Auto', filterTerm: 'Coprisedili Auto' },
          { label: 'Cinture di Sicurezza Pet', filterTerm: 'Coprisedili Auto' },
          { label: 'Rampe Pieghevoli', filterTerm: 'Coprisedili Auto' },
        ],
      },
      {
        heading: 'Idratazione Fuori Casa',
        links: [
          { label: 'Borracce Portatili', filterTerm: 'Borracce Portatili' },
          { label: 'Ciotole Silicone Pieghevoli', filterTerm: 'Borracce Portatili' },
          { label: 'Kit Viaggio Completo', filterTerm: 'Zaini Trasportini' },
        ],
      },
    ],
  },
  {
    slug: 'cura-toelettatura',
    name: 'Cura & Toelettatura',
    tagline: 'Manto lucido, unghie curate e routine senza stress',
    iconName: 'Sparkles',
    featuredProductId: 107,
    columns: [
      {
        heading: 'Spazzole & Pelo',
        links: [
          { label: 'Spazzole Autopulenti', filterTerm: 'Spazzole Autopulenti' },
          { label: 'Pettini Sottopelo', filterTerm: 'Spazzole Autopulenti' },
          { label: 'Guanti Massaggianti', filterTerm: 'Spazzole Autopulenti' },
        ],
      },
      {
        heading: 'Unghie & Zampette',
        links: [
          { label: 'Tagliaunghie LED', filterTerm: 'Tagliaunghie LED' },
          { label: 'Lima Elettrica Silenziosa', filterTerm: 'Tagliaunghie LED' },
          { label: 'Balsamo Polpastrelli', filterTerm: 'Bagno e Igiene' },
        ],
      },
      {
        heading: 'Asciugatura & Bagno',
        links: [
          { label: 'Asciugamani Microfibra', filterTerm: 'Asciugamani Microfibra' },
          { label: 'Bagno e Igiene', filterTerm: 'Bagno e Igiene' },
          { label: 'Doccette Massaggio', filterTerm: 'Bagno e Igiene' },
        ],
      },
    ],
  },
  {
    slug: 'smart-pet-tech',
    name: 'Smart Pet Tech',
    tagline: 'Pasti programmati, video HD e divertimento autonomo',
    iconName: 'Cpu',
    featuredProductId: 105,
    columns: [
      {
        heading: 'Alimentazione Smart',
        links: [
          { label: 'Distributori Automatici Wi-Fi', filterTerm: 'Distributori Automatici Wi-Fi' },
          { label: 'Bilance Ciotola Digitali', filterTerm: 'Distributori Automatici Wi-Fi' },
          { label: 'Fontanelle Smart UV', filterTerm: 'Fontanelle Acqua' },
        ],
      },
      {
        heading: 'Monitoraggio Casa',
        links: [
          { label: 'Telecamere Pet', filterTerm: 'Telecamere Pet' },
          { label: 'Localizzatori', filterTerm: 'Localizzatori' },
          { label: 'Gattaie Microchip', filterTerm: 'Telecamere Pet' },
        ],
      },
      {
        heading: 'Movimento & Gioco',
        links: [
          { label: 'Giochi Laser Automatici', filterTerm: 'Giochi Laser Automatici' },
          { label: 'Sfere Smart Ricaricabili', filterTerm: 'Giochi Interattivi' },
          { label: 'Lanciapalle Automatici', filterTerm: 'Giochi Laser Automatici' },
        ],
      },
    ],
  },
  {
    slug: 'piccoli-animali',
    name: 'Piccoli Animali',
    tagline: 'Fibre naturali e spazi sicuri per conigli, criceti e uccelli',
    iconName: 'Rabbit',
    featuredProductId: 112,
    columns: [
      {
        heading: 'Conigli & Roditori',
        links: [
          { label: 'Conigli e Roditori', filterTerm: 'Conigli e Roditori' },
          { label: 'Tunnel in Fibra Naturale', filterTerm: 'Conigli e Roditori' },
          { label: 'Masticabili in Legno', filterTerm: 'Conigli e Roditori' },
        ],
      },
      {
        heading: 'Volatili',
        links: [
          { label: 'Uccelli', filterTerm: 'Uccelli' },
          { label: 'Posatoi & Altalene', filterTerm: 'Uccelli' },
          { label: 'Bagnetti Esterni', filterTerm: 'Uccelli' },
        ],
      },
      {
        heading: 'Habitat & Pulizia',
        links: [
          { label: 'Accessori Gabbie', filterTerm: 'Accessori Gabbie' },
          { label: 'Beverini Antigoccia', filterTerm: 'Accessori Gabbie' },
          { label: 'Fieno & Lettiera Vegetale', filterTerm: 'Accessori Gabbie' },
        ],
      },
    ],
  },
  {
    slug: 'novita',
    name: 'Novità del Mese',
    tagline: 'I nuovi arrivi selezionati dal catalogo stagionale',
    iconName: 'Star',
    featuredProductId: 111,
    columns: [
      {
        heading: 'Nuovi Arrivi Tech',
        links: [
          { label: 'Telecamera Pet Treat HD', filterTerm: 'Telecamere Pet' },
          { label: 'Sfera Smart Motion', filterTerm: 'Giochi Interattivi' },
          { label: 'Distributore Doppia Ciotola', filterTerm: 'Distributori Automatici Wi-Fi' },
        ],
      },
      {
        heading: 'Nuovi Arrivi Casa',
        links: [
          { label: 'Torre Tiragraffi Betulla', filterTerm: 'Tiragraffi e Alberi' },
          { label: 'Fontanella Ceramica Pura', filterTerm: 'Fontanelle Acqua' },
          { label: 'Tunnel Seagrass Conigli', filterTerm: 'Conigli e Roditori' },
        ],
      },
      {
        heading: 'Nuovi Arrivi Outdoor',
        links: [
          { label: 'Zaino Panoramico Mesh', filterTerm: 'Zaini Trasportini' },
          { label: 'Pettorina Ergo Arancio', filterTerm: 'Guinzagli e Pettorine' },
          { label: 'Amaca Auto Impermeabile', filterTerm: 'Coprisedili Auto' },
        ],
      },
    ],
  },
  {
    slug: 'offerte',
    name: 'Offerte & Set Risparmio',
    tagline: 'Sconti fino al 30% e bundle pensati per risparmiare',
    iconName: 'Tag',
    featuredProductId: 102,
    columns: [
      {
        heading: 'Promozioni Attive',
        links: [
          { label: 'Tutti i Prodotti in Offerta', filterTerm: 'IN_OFFERTA' },
          { label: 'Best Seller Scontati', filterTerm: 'IN_OFFERTA' },
          { label: 'Sotto i 30€', filterTerm: 'IN_OFFERTA' },
        ],
      },
      {
        heading: 'Set & Bundle',
        links: [
          { label: 'Set Passeggio Completo', filterTerm: 'Guinzagli e Pettorine' },
          { label: 'Kit Toelettatura Casa', filterTerm: 'Spazzole Autopulenti' },
          { label: 'Pack Comfort & Riposo', filterTerm: 'Cucce e Letti' },
        ],
      },
      {
        heading: 'Vantaggi Club',
        links: [
          { label: 'Spedizione Gratuita > 39€', filterTerm: 'IN_OFFERTA' },
          { label: 'Sconto 10% Primo Ordine', filterTerm: 'IN_OFFERTA' },
          { label: 'Garanzia Reso 30 Giorni', filterTerm: 'IN_OFFERTA' },
        ],
      },
    ],
  },
];
