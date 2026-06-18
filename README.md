# LittleLayers

LittleLayers ist eine mobile Web-App, die anhand von Kindesalter, Schlafzimmer-Temperatur und Außentemperatur Empfehlungen für Kleidung am Tag, draußen und in der Nacht gibt.

## Lokal starten

```bash
python -m http.server 5174
```

Danach im Browser öffnen:

```text
http://127.0.0.1:5174
```

## Hinweise

- Die App speichert Eingaben lokal im Browser.
- Automatische Standorterkennung benötigt HTTPS oder `localhost`.
- Wetterdaten werden über Open-Meteo geladen.
