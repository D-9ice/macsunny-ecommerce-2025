import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

let cachedClient: MongoClient | null = null;

async function getMongoClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

// GET - Fetch delivery settings
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('ms_admin')?.value === '1';
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await getMongoClient();
    const db = client.db('macsunny');
    
    // Get settings from database
    const settings = await db.collection('delivery_settings').findOne({});
    
    // If no settings exist, create default ones
    if (!settings) {
      const defaultSettings = {
        freeDeliveryThreshold: 500,
        zones: [
          {
            _id: '1',
            name: 'Accra Metro',
            basePrice: 10,
            pricePerKm: 2,
            maxDistance: 15,
            regions: ['Greater Accra', 'Accra'],
            enabled: true,
          },
          {
            _id: '2',
            name: 'Greater Accra Extended',
            basePrice: 20,
            pricePerKm: 3,
            maxDistance: 50,
            regions: ['Tema', 'Kasoa', 'Madina', 'Spintex'],
            enabled: true,
          },
          {
            _id: '3',
            name: 'Regional Capitals',
            basePrice: 50,
            pricePerKm: 5,
            maxDistance: 300,
            regions: ['Kumasi', 'Takoradi', 'Cape Coast', 'Tamale', 'Sunyani', 'Koforidua'],
            enabled: true,
          },
          {
            _id: '4',
            name: 'Other Regions',
            basePrice: 80,
            pricePerKm: 7,
            maxDistance: 500,
            regions: [],
            enabled: true,
          },
        ],
        updatedAt: new Date(),
      };
      
      await db.collection('delivery_settings').insertOne(defaultSettings);
      
      return NextResponse.json({
        freeDeliveryThreshold: defaultSettings.freeDeliveryThreshold,
        zones: defaultSettings.zones,
      });
    }

    return NextResponse.json({
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      zones: settings.zones,
    });
  } catch (error: any) {
    console.error('Error fetching delivery settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery settings' },
      { status: 500 }
    );
  }
}

// POST - Save delivery settings
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('ms_admin')?.value === '1';
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { freeDeliveryThreshold, zones } = body;

    // Validate input
    if (typeof freeDeliveryThreshold !== 'number' || !Array.isArray(zones)) {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    const client = await getMongoClient();
    const db = client.db('macsunny');
    
    // Update or insert settings
    await db.collection('delivery_settings').updateOne(
      {},
      {
        $set: {
          freeDeliveryThreshold,
          zones,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Delivery settings updated successfully',
    });
  } catch (error: any) {
    console.error('Error saving delivery settings:', error);
    return NextResponse.json(
      { error: 'Failed to save delivery settings' },
      { status: 500 }
    );
  }
}
