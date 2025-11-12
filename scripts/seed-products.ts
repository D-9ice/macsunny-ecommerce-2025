import { connectDB, ProductModel } from '@/app/lib/mongodb';

async function seedProducts() {
  await connectDB();
  console.log('✅ Connected to MongoDB');

  const products = [
    // === Uploaded Images (Real) ===
    {
      sku: 'RES-10K-5PCS',
      name: 'Resistor 10kΩ 1% (5 pcs)',
      category: 'Resistors',
      price: 1.2,
      image: '/images/components/10kohm-5pcs.png',
    },
    {
      sku: 'IC-TDA2040',
      name: 'TDA2040 Audio Amplifier IC (STMicroelectronics)',
      category: 'ICs',
      price: 8.5,
      image: '/images/components/TDA2040.png',
    },
    {
      sku: 'CAP-470UF-450V',
      name: 'Electrolytic Capacitor 470µF 450V',
      category: 'Capacitors',
      price: 5.9,
      image: '/images/components/470uf-450v.png',
    },
    {
      sku: 'MOSFET-IRFP460',
      name: 'IRFP460 N-Channel Power MOSFET',
      category: 'MOSFETs',
      price: 14.0,
      image: '/images/components/IRFP460.png',
    },
    {
      sku: 'REG-L7812CV',
      name: 'L7812CV Voltage Regulator 12V 1A',
      category: 'Voltage Regulators',
      price: 3.5,
      image: '/images/components/L7812CV.png',
    },

    // === Additional Components (Placeholder Images) ===
    {
      sku: 'MCU-ESP32-DEVKIT',
      name: 'ESP32 Development Board WiFi+Bluetooth',
      category: 'Microcontrollers',
      price: 35.0,
      image: '/images/components/esp32.jpg',
    },
    {
      sku: 'IC-NE555',
      name: 'NE555 Timer IC',
      category: 'ICs',
      price: 2.5,
      image: '/images/components/ne555.jpg',
    },
    {
      sku: 'MOD-EGS002',
      name: 'SPWM Pure Sine Wave Inverter Module (EGS002)',
      category: 'Modules',
      price: 45.0,
      image: '/images/components/egs002.jpg',
    },
    {
      sku: 'PWR-BUCK-XL4015',
      name: 'Buck Converter Module XL4015 5A',
      category: 'Power Modules',
      price: 18.0,
      image: '/images/components/buck-xl4015.jpg',
    },
    {
      sku: 'PWR-BOOST-MT3608',
      name: 'Boost Converter Module MT3608 2A',
      category: 'Power Modules',
      price: 12.0,
      image: '/images/components/boost-mt3608.jpg',
    },
    {
      sku: 'TOOL-MULTIMETER-DT830D',
      name: 'Digital Multimeter DT830D',
      category: 'Tools',
      price: 60.0,
      image: '/images/components/multimeter.jpg',
    },
    {
      sku: 'TOOL-SOLDER-IRON60W',
      name: 'Soldering Iron 60W Adjustable Temperature',
      category: 'Tools',
      price: 40.0,
      image: '/images/components/solder-iron.jpg',
    },
    {
      sku: 'CONN-DC-JACK-2.1MM',
      name: 'DC Barrel Jack 2.1mm Panel Mount',
      category: 'Connectors',
      price: 4.5,
      image: '/images/components/dc-jack.jpg',
    },
    {
      sku: 'CONN-JST-XH2.54',
      name: 'JST XH 2.54mm Connector Set (20 Pairs)',
      category: 'Connectors',
      price: 10.0,
      image: '/images/components/jst-xh.jpg',
    },
    {
      sku: 'IC-LM324N',
      name: 'LM324N Quad Op-Amp',
      category: 'ICs',
      price: 3.0,
      image: '/images/components/lm324.jpg',
    },
    {
      sku: 'IC-LM358',
      name: 'LM358 Dual Operational Amplifier',
      category: 'ICs',
      price: 2.8,
      image: '/images/components/lm358.jpg',
    },
    {
      sku: 'TRIAC-BTA16',
      name: 'BTA16-600B Triac 16A 600V',
      category: 'Triacs',
      price: 7.0,
      image: '/images/components/bta16.jpg',
    },
    {
      sku: 'THY-2N6509',
      name: '2N6509 Silicon Controlled Rectifier (SCR)',
      category: 'Thyristors',
      price: 8.5,
      image: '/images/components/2n6509.jpg',
    },
    {
      sku: 'IGBT-IRG4PC50W',
      name: 'IRG4PC50W IGBT Transistor 600V 26A',
      category: 'IGBTs',
      price: 18.0,
      image: '/images/components/irg4pc50w.jpg',
    },
    {
      sku: 'BJT-2N2222',
      name: '2N2222A NPN Transistor TO-92',
      category: 'BJTs',
      price: 1.5,
      image: '/images/components/2n2222.jpg',
    },
    {
      sku: 'BJT-BC547',
      name: 'BC547B NPN General Purpose Transistor',
      category: 'BJTs',
      price: 1.2,
      image: '/images/components/bc547.jpg',
    },
    {
      sku: 'LED-5MM-RGB',
      name: '5mm RGB LED (Common Cathode)',
      category: 'LEDs',
      price: 3.5,
      image: '/images/components/led-rgb.jpg',
    },
    {
      sku: 'LED-7SEG-RED',
      name: '7-Segment LED Display (Red)',
      category: 'Displays',
      price: 6.0,
      image: '/images/components/7segment.jpg',
    },
    {
      sku: 'DISP-LCD16X2',
      name: 'LCD Display 16x2 (HD44780)',
      category: 'Displays',
      price: 15.0,
      image: '/images/components/lcd16x2.jpg',
    },
    {
      sku: 'WIRE-22AWG-ROLL',
      name: 'Hook-Up Wire Roll 22AWG (10m)',
      category: 'Cables',
      price: 9.0,
      image: '/images/components/wire.jpg',
    },
    {
      sku: 'SENSOR-PIR-HC-SR501',
      name: 'PIR Motion Sensor HC-SR501',
      category: 'Sensors',
      price: 14.0,
      image: '/images/components/pir-sensor.jpg',
    },
    {
      sku: 'TOOL-SCREWDRIVER-SET6',
      name: 'Precision Screwdriver Set (6 pcs)',
      category: 'Tools',
      price: 25.0,
      image: '/images/components/screwdrivers.jpg',
    },
    {
      sku: 'TOOL-PLIERS-COMBO',
      name: 'Combination Pliers 8 inch',
      category: 'Tools',
      price: 30.0,
      image: '/images/components/pliers.jpg',
    },
    {
      sku: 'RES-1K-0603',
      name: 'Resistor 1kΩ 1% 0603',
      category: 'Resistors',
      price: 1.1,
      image: '/images/components/resistor-1k.jpg',
    },
    {
      sku: 'IND-100UH',
      name: 'Inductor 100µH 1A',
      category: 'Inductors',
      price: 2.5,
      image: '/images/components/inductor-100uh.jpg',
    },
    {
      sku: 'CAP-100NF',
      name: 'Ceramic Capacitor 100nF (104)',
      category: 'Capacitors',
      price: 0.8,
      image: '/images/components/cap-100nf.jpg',
    },
    {
      sku: 'MCU-ARDUINO-NANO',
      name: 'Arduino Nano V3 Compatible Board',
      category: 'Microcontrollers',
      price: 42.0,
      image: '/images/components/arduino-nano.jpg',
    },
    {
      sku: 'TOOL-SOLDER-WIRE',
      name: 'Solder Wire (60/40 Tin-Lead) 100g',
      category: 'Tools',
      price: 22.0,
      image: '/images/components/solder-wire.jpg',
    },
    {
      sku: 'TOOL-BREADBOARD-830',
      name: 'Solderless Breadboard 830 Points',
      category: 'Tools',
      price: 12.5,
      image: '/images/components/breadboard.jpg',
    },
    {
      sku: 'MOD-RELAY-5V',
      name: '5V Relay Module (1 Channel)',
      category: 'Modules',
      price: 10.5,
      image: '/images/components/relay.jpg',
    },
    {
      sku: 'MOD-BLUETOOTH-HC05',
      name: 'Bluetooth Module HC-05',
      category: 'Modules',
      price: 35.0,
      image: '/images/components/hc05.jpg',
    },
    {
      sku: 'MOD-IR-SENSOR',
      name: 'IR Obstacle Avoidance Sensor',
      category: 'Sensors',
      price: 6.0,
      image: '/images/components/ir-sensor.jpg',
    },
    {
      sku: 'POWER-SUPPLY-12V5A',
      name: 'Power Supply Adapter 12V 5A',
      category: 'Power',
      price: 60.0,
      image: '/images/components/power-12v5a.jpg',
    },
    {
      sku: 'TRANSFORMER-12V-2A',
      name: '12V 2A Step Down Transformer',
      category: 'Power',
      price: 50.0,
      image: '/images/components/transformer.jpg',
    },
    {
      sku: 'TOOL-FAN-COOLING-12V',
      name: 'DC Cooling Fan 12V 80mm',
      category: 'Accessories',
      price: 18.0,
      image: '/images/components/fan.jpg',
    },
    {
      sku: 'MISC-HEATSINK-TO220',
      name: 'Aluminum Heat Sink for TO-220 Packages',
      category: 'Accessories',
      price: 4.0,
      image: '/images/components/heatsink.jpg',
    },
  ];

  // Insert or update products
  for (const product of products) {
    await ProductModel.updateOne(
      { sku: product.sku },
      { $set: product },
      { upsert: true }
    );
  }

  console.log(`✅ Seeded ${products.length} products successfully!`);
  process.exit(0);
}

seedProducts().catch((err) => {
  console.error('❌ Error seeding products:', err);
  process.exit(1);
});
