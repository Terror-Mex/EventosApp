import { useEffect, useRef, useState } from 'react';

// Loader singleton para no cargar el script de Google múltiples veces
let loadPromise = null;
const loadGoogleMaps = (apiKey) => {
    if (window.google?.maps?.places?.AutocompleteSuggestion) return Promise.resolve(window.google.maps);
    if (!loadPromise) {
        loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // No debemos incluir '&libraries=places' en la URL si vamos a usar importLibrary (API V2)
            // Ya que Google lo considera un choque de namespaces y lanza el error de "Can't load correctly".
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve(window.google.maps);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return loadPromise;
};

const NewPlaceAutocomplete = ({ value = "", onPlaceSelected, placeholder, className, required }) => {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);
    const [placesLibrary, setPlacesLibrary] = useState(null);

    // Cargar la librería NEW Places programáticamente en el montaje
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY).then(async (maps) => {
            const placesLib = await maps.importLibrary("places");
            // Guardamos la referencia de las clases de la Nueva API V2
            setPlacesLibrary(placesLib);
        }).catch(err => console.error("Error cargando Google Maps NEW Places API", err));
    }, []);

    // Cerrar sugerencias si hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Buscar sugerencias usando la NUEVA API
    const handleInputChange = async (e) => {
        const val = e.target.value;
        setInputValue(val);
        // Si borramos el texto, disparamos el callback vacío para que limpie la latitud/longitud
        onPlaceSelected({ lat: null, lng: null, address: val });

        if (!val.trim() || !placesLibrary) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            // Utilizamos el nuevo formato AutocompleteSuggestion.fetchAutocompleteSuggestions (Places API v2)
            const request = {
                input: val,
                region: "MX", // Preferencia de zona y sesgo de región
                includedRegionCodes: ["MX"], // Restricción estricta y absoluta (El estándar ISO exige mayúsculas 'MX')
                // En la API V2, la restricción 'address' vieja se mapea exactamente a estos 5 tipos primarios:
                // Calles, Rutas, Predios, y Códigos Postales. Al activar esto, Google prioriza darte la "puerta" del lugar.
                includedPrimaryTypes: ["street_address", "route", "premise", "subpremise", "postal_code"],
            };
            const response = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            setSuggestions(response.suggestions || []);
            setShowSuggestions(true);
        } catch (error) {
            console.error("New Places API fetch Error:", error);
            setSuggestions([]);
        }
    };

    // Al hacer click en una sugerencia, solicitar los detalles con Place ID v2 (Optimizado por Costos)
    const handleSuggestionClick = async (suggestion) => {
        const prediction = suggestion.placePrediction;
        setInputValue(prediction.text.text);
        setShowSuggestions(false);

        try {
            const Place = placesLibrary.Place;
            // Instanciar por Id es la forma correcta de v2
            const place = new Place({ id: prediction.placeId, requestedLanguage: 'es' });
            
            // fetchFields exige solicitar exactamente lo que necesitas en la nueva API,
            // garantizando cero sobrecostos por campos de facturación costosos que no usamos.
            await place.fetchFields({
                fields: ["location", "formattedAddress", "displayName"],
            });

            onPlaceSelected({
                lat: place.location.lat(),
                lng: place.location.lng(),
                address: place.formattedAddress || place.displayName,
            });
        } catch (error) {
            console.error("Error Fetching Place Details NEW API:", error);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
                required={required}
            />
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => {
                        const pred = suggestion.placePrediction;
                        return (
                            <li
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center"
                            >
                                <span className="w-8 flex-shrink-0 text-accent">📍</span>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{pred.mainText.text}</p>
                                    {pred.secondaryText && (
                                        <p className="text-xs text-gray-500">{pred.secondaryText.text}</p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default NewPlaceAutocomplete;
