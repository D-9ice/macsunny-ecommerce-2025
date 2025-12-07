'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DeliveryZone {
  _id?: string;
  name: string;
  basePrice: number;
  pricePerKm: number;
  maxDistance: number;
  regions: string[];
  enabled: boolean;
}

interface DeliverySettings {
  freeDeliveryThreshold: number;
  zones: DeliveryZone[];
}

export default function DeliverySettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [showAddZone, setShowAddZone] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchSettings();
  }, []);

  const checkAuth = async () => {
    const res = await fetch('/api/admin/check-auth', {
      credentials: 'include',
    });
    if (!res.ok) {
      router.push('/admin/login');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/delivery-settings', {
        credentials: 'include', // Important: include cookies
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        console.error('Failed to fetch settings:', res.status);
        if (res.status === 401) {
          // Unauthorized - redirect to login
          router.push('/admin/login');
          return;
        }
        // Set default settings if fetch fails
        setSettings({
          freeDeliveryThreshold: 500,
          zones: [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      // Set default settings on error
      setSettings({
        freeDeliveryThreshold: 500,
        zones: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/admin/delivery-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage('✅ Delivery settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Failed to save settings');
      }
    } catch (error) {
      setMessage('❌ Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddZone = () => {
    setEditingZone({
      name: '',
      basePrice: 0,
      pricePerKm: 0,
      maxDistance: 0,
      regions: [],
      enabled: true,
    });
    setShowAddZone(true);
  };

  const handleSaveZone = () => {
    if (!editingZone || !settings) return;

    if (editingZone._id) {
      // Update existing zone
      setSettings({
        ...settings,
        zones: settings.zones.map((z) => 
          z._id === editingZone._id ? editingZone : z
        ),
      });
    } else {
      // Add new zone
      setSettings({
        ...settings,
        zones: [...settings.zones, { ...editingZone, _id: Date.now().toString() }],
      });
    }

    setEditingZone(null);
    setShowAddZone(false);
  };

  const handleDeleteZone = (zoneId: string) => {
    if (!settings) return;
    if (confirm('Are you sure you want to delete this delivery zone?')) {
      setSettings({
        ...settings,
        zones: settings.zones.filter((z) => z._id !== zoneId),
      });
    }
  };

  const handleToggleZone = (zoneId: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      zones: settings.zones.map((z) =>
        z._id === zoneId ? { ...z, enabled: !z.enabled } : z
      ),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading delivery settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Failed to load settings</div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="bg-green-700 hover:bg-green-800 px-6 py-2 rounded-lg text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">🚚 Delivery Settings</h1>
            <p className="text-gray-400 mt-1">Manage delivery zones and pricing</p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* Free Delivery Threshold */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Free Delivery Threshold</h2>
          <div className="flex items-center gap-4">
            <label className="text-gray-300">Orders above</label>
            <input
              type="number"
              value={settings.freeDeliveryThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  freeDeliveryThreshold: parseFloat(e.target.value) || 0,
                })
              }
              className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 w-32 text-white"
              step="10"
            />
            <label className="text-gray-300">GHS get FREE delivery</label>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Customers whose cart total is above this amount will receive free delivery
          </p>
        </div>

        {/* Delivery Zones */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Delivery Zones</h2>
            <button
              onClick={handleAddZone}
              className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg transition-colors"
            >
              + Add Zone
            </button>
          </div>

          <div className="space-y-4">
            {settings.zones.map((zone) => (
              <div
                key={zone._id}
                className={`border rounded-lg p-4 ${
                  zone.enabled ? 'border-gray-600 bg-gray-700/50' : 'border-gray-700 bg-gray-800/50 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleZone(zone._id!)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        zone.enabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          zone.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <h3 className="text-lg font-semibold">{zone.name}</h3>
                      <p className="text-sm text-gray-400">
                        Up to {zone.maxDistance} km from store
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingZone(zone);
                        setShowAddZone(true);
                      }}
                      className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone._id!)}
                      className="bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-400">Base Price</p>
                    <p className="text-lg font-semibold">GHS {zone.basePrice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Price per KM</p>
                    <p className="text-lg font-semibold">GHS {zone.pricePerKm}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Max Distance</p>
                    <p className="text-lg font-semibold">{zone.maxDistance} km</p>
                  </div>
                </div>

                {zone.regions.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Regions:</p>
                    <div className="flex flex-wrap gap-2">
                      {zone.regions.map((region, idx) => (
                        <span
                          key={idx}
                          className="bg-gray-600 px-2 py-1 rounded text-sm"
                        >
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-green-700 hover:bg-green-800 disabled:bg-gray-600 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Saving...' : '💾 Save All Changes'}
          </button>
        </div>
      </div>

      {/* Add/Edit Zone Modal */}
      {showAddZone && editingZone && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingZone._id ? 'Edit Delivery Zone' : 'Add New Delivery Zone'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Zone Name</label>
                <input
                  type="text"
                  value={editingZone.name}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, name: e.target.value })
                  }
                  placeholder="e.g., Accra Metro"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Base Price (GHS)
                  </label>
                  <input
                    type="number"
                    value={editingZone.basePrice}
                    onChange={(e) =>
                      setEditingZone({
                        ...editingZone,
                        basePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price per KM (GHS)
                  </label>
                  <input
                    type="number"
                    value={editingZone.pricePerKm}
                    onChange={(e) =>
                      setEditingZone({
                        ...editingZone,
                        pricePerKm: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Distance (KM)
                  </label>
                  <input
                    type="number"
                    value={editingZone.maxDistance}
                    onChange={(e) =>
                      setEditingZone({
                        ...editingZone,
                        maxDistance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    step="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Regions (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingZone.regions.join(', ')}
                  onChange={(e) =>
                    setEditingZone({
                      ...editingZone,
                      regions: e.target.value
                        .split(',')
                        .map((r) => r.trim())
                        .filter((r) => r),
                    })
                  }
                  placeholder="e.g., Accra, Tema, Madina"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional: Specific regions this zone applies to
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="zoneEnabled"
                  checked={editingZone.enabled}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, enabled: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="zoneEnabled" className="text-sm">
                  Enable this zone immediately
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={() => {
                  setEditingZone(null);
                  setShowAddZone(false);
                }}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveZone}
                className="bg-green-700 hover:bg-green-800 px-6 py-2 rounded-lg transition-colors"
              >
                {editingZone._id ? 'Update Zone' : 'Add Zone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
