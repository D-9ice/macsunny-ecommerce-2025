'use client';
import { useEffect, useState } from "react";

export default function GeoTracker() {
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [error, setError] = useState<string|null>(null);

  function ask() {
    if (!navigator.geolocation) return setError("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c={lat:pos.coords.latitude,lng:pos.coords.longitude};
        setCoords(c);
        localStorage.setItem("ms_geo",JSON.stringify(c));
      },
      err => setError(err.message),
      {enableHighAccuracy:true,timeout:10000}
    );
  }

  useEffect(()=>{try{
    const raw=localStorage.getItem("ms_geo");
    if(raw) setCoords(JSON.parse(raw));
  }catch{}},[]);

  return(
    <div className="border rounded-md p-3 text-sm">
      <div className="font-medium mb-1">Delivery Location</div>
      {coords?<div>Lat:{coords.lat.toFixed(6)}, Lng:{coords.lng.toFixed(6)}</div>
      :<div className="text-gray-500">No location saved yet.</div>}
      {error&&<div className="text-red-600 mt-1">{error}</div>}
      <button onClick={ask} className="mt-2 px-3 py-2 rounded-md bg-green-600 text-white text-xs">Share My Location</button>
    </div>
  );
}
