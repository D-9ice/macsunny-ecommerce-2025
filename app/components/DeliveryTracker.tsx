'use client';

import { useState, useEffect } from 'react';
import { Location, calculateDeliveryCost, geocodeAddress, STORE_LOCATION } from '@/app/lib/geolocation';
import { Order } from '@/app/lib/orders';

interface DeliveryTrackerProps {
  order: Order;
  onUpdate?: (deliveryInfo: any) => void;
}

export default function DeliveryTracker({ order, onUpdate }: DeliveryTrackerProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to geocode customer address
    if (order.customerAddress) {
      geocodeCustomerAddress();
    }
  }, [order.customerAddress]);

  const geocodeCustomerAddress = async () => {
    if (!order.customerAddress) {
      setError('No customer address available');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const loc = await geocodeAddress(order.customerAddress);
      setLocation(loc);
      
      const info = calculateDeliveryCost(loc, order.total);
      setDeliveryInfo(info);
      
      if (onUpdate) {
        onUpdate(info);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to locate address');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <span className="text-xl">🚚</span>
          Delivery Information
        </h4>
        <div className="flex items-center justify-center py-4">
          <span className="animate-spin">⏳</span>
          <span className="ml-2 text-gray-400">Calculating delivery route...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <span className="text-xl">🚚</span>
          Delivery Information
        </h4>
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded text-sm">
          {error}
        </div>
        <button
          onClick={geocodeCustomerAddress}
          className="mt-3 w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!location || !deliveryInfo) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <span className="text-xl">🚚</span>
          Delivery Information
        </h4>
        <p className="text-gray-400 text-sm mb-3">
          No delivery information available
        </p>
        <button
          onClick={geocodeCustomerAddress}
          className="w-full bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          Calculate Delivery
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <span className="text-xl">🚚</span>
        Delivery Information
      </h4>

      {/* Delivery Route */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-green-500 text-xl">📦</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400">From</p>
            <p className="text-sm text-white">{STORE_LOCATION.address}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center">
          <div className="border-l-2 border-dashed border-gray-600 h-8"></div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-blue-500 text-xl">📍</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400">To</p>
            <p className="text-sm text-white">{location.address}</p>
          </div>
        </div>
      </div>

      {/* Delivery Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/40 rounded p-2">
          <p className="text-xs text-gray-400 mb-1">Distance</p>
          <p className="text-sm font-semibold text-white">{deliveryInfo.distance} km</p>
        </div>
        <div className="bg-black/40 rounded p-2">
          <p className="text-xs text-gray-400 mb-1">Zone</p>
          <p className="text-sm font-semibold text-white">{deliveryInfo.zone.name}</p>
        </div>
        <div className="bg-black/40 rounded p-2">
          <p className="text-xs text-gray-400 mb-1">Est. Time</p>
          <p className="text-sm font-semibold text-white">{deliveryInfo.estimatedTime}</p>
        </div>
        <div className="bg-black/40 rounded p-2">
          <p className="text-xs text-gray-400 mb-1">Delivery Cost</p>
          {deliveryInfo.freeDelivery ? (
            <p className="text-sm font-bold text-green-400">FREE</p>
          ) : (
            <p className="text-sm font-semibold text-yellow-400">
              GHS {deliveryInfo.deliveryCost.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Map Link */}
      <a
        href={`https://www.google.com/maps/dir/?api=1&origin=${STORE_LOCATION.latitude},${STORE_LOCATION.longitude}&destination=${location.latitude},${location.longitude}&travelmode=driving`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm text-center transition-colors"
      >
        🗺️ Open in Google Maps
      </a>
    </div>
  );
}
