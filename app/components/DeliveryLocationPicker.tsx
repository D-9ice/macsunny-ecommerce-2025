'use client';

import { useState, useEffect } from 'react';
import {
  Location,
  getCurrentLocation,
  geocodeAddress,
  calculateDeliveryCost,
  STORE_LOCATION,
} from '@/app/lib/geolocation';

interface DeliveryLocationPickerProps {
  cartTotal: number;
  onLocationSelected: (location: Location, deliveryInfo: any) => void;
}

export default function DeliveryLocationPicker({
  cartTotal,
  onLocationSelected,
}: DeliveryLocationPickerProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);

  const handleGetCurrentLocation = async () => {
    setLoading(true);
    setError('');
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      calculateAndSetDelivery(loc);
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      setUseManualEntry(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAddress.trim()) {
      setError('Please enter an address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const loc = await geocodeAddress(manualAddress);
      setLocation(loc);
      calculateAndSetDelivery(loc);
    } catch (err: any) {
      setError(err.message || 'Failed to geocode address');
    } finally {
      setLoading(false);
    }
  };

  const calculateAndSetDelivery = (loc: Location) => {
    const info = calculateDeliveryCost(loc, cartTotal);
    setDeliveryInfo(info);
    onLocationSelected(loc, info);
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
        <span className="text-2xl">📍</span>
        Delivery Location
      </h3>

      {!location ? (
        <div className="space-y-4">
          {!useManualEntry ? (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                We'll use your current location to calculate delivery costs
              </p>
              <button
                onClick={handleGetCurrentLocation}
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Getting location...
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    Use My Current Location
                  </>
                )}
              </button>
              <button
                onClick={() => setUseManualEntry(true)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Enter Address Manually
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualAddressSubmit} className="space-y-3">
              <p className="text-gray-400 text-sm">
                Enter your delivery address in Ghana
              </p>
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="e.g., Accra, Tema, Kumasi..."
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Finding location...' : 'Calculate Delivery'}
                </button>
                <button
                  type="button"
                  onClick={() => setUseManualEntry(false)}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Location Details */}
          <div className="bg-black/60 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xl">📍</span>
              <div className="flex-1">
                <p className="text-white font-medium">Delivery Address</p>
                <p className="text-gray-400 text-sm mt-1">{location.address}</p>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          {deliveryInfo && (
            <div className="bg-black/60 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Delivery Zone</span>
                <span className="text-white font-medium">{deliveryInfo.zone.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Distance</span>
                <span className="text-white font-medium">{deliveryInfo.distance} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Estimated Time</span>
                <span className="text-white font-medium">{deliveryInfo.estimatedTime}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-gray-400">Delivery Cost</span>
                {deliveryInfo.freeDelivery ? (
                  <div className="text-right">
                    <span className="text-green-400 font-bold text-lg">FREE</span>
                    <p className="text-gray-500 text-xs line-through">GHS {deliveryInfo.zone.basePrice + deliveryInfo.distance * deliveryInfo.zone.pricePerKm}</p>
                  </div>
                ) : (
                  <span className="text-yellow-400 font-bold text-lg">
                    GHS {deliveryInfo.deliveryCost.toFixed(2)}
                  </span>
                )}
              </div>
              {cartTotal < 500 && (
                <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-3 py-2 rounded text-xs">
                  💡 Add GHS {(500 - cartTotal).toFixed(2)} more for FREE delivery!
                </div>
              )}
            </div>
          )}

          {/* Change Location */}
          <button
            onClick={() => {
              setLocation(null);
              setDeliveryInfo(null);
              setManualAddress('');
              setError('');
            }}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Change Location
          </button>
        </div>
      )}

      {/* Store Location Reference */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs">
          📦 Shipping from: {STORE_LOCATION.address}
        </p>
      </div>
    </div>
  );
}
