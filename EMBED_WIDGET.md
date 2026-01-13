# Embed Widget System 📦

## Übersicht

Das Embed Widget System ermöglicht es, Coin-Communities auf externen Websites einzubinden - WordPress, Wix, HTML, oder jede andere Plattform.

## Features

- ✅ **Kompakte Ansicht**: Zeigt Coin-Daten, Trust Score, Tier und Community-Stats
- ✅ **Erweiterte Ansicht**: Vollständige Community-Ansicht im Widget
- ✅ **Responsive**: Funktioniert auf Desktop und Mobile
- ✅ **Universal**: Funktioniert überall (iframe-basiert)
- ✅ **Einfach**: Einfach Code kopieren und einfügen

## Verwendung

### 1. Embed-Code abrufen

1. Gehe zur Coin-Detail-Seite: `/coin/[mint]`
2. Klicke auf den **"📦 Embed Widget"** Button
3. Oder direkt: `/coin/[mint]/embed`

### 2. Embed-Methode wählen

**iframe (Empfohlen):**
- Funktioniert überall
- Einfach zu verwenden
- Keine JavaScript-Dependencies

**JavaScript:**
- Mehr Flexibilität
- Benötigt Script-Tag

### 3. Code einfügen

**WordPress:**
1. Block "Custom HTML" hinzufügen
2. Embed-Code einfügen
3. Fertig!

**Wix:**
1. Element "HTML Code" hinzufügen
2. Embed-Code einfügen
3. Fertig!

**HTML:**
1. Code direkt in HTML einfügen
2. Fertig!

## Widget-URLs

- **Widget-Ansicht**: `/embed/[mint]`
- **Embed-Code-Generator**: `/coin/[mint]/embed`
- **Vollständige Ansicht**: `/coin/[mint]`

## Beispiel

```html
<iframe 
  src="https://yourdomain.com/embed/Etctbh5arcwvJcAibRa3wqn7VJXRLxcD8Cc1KBptpump" 
  width="100%" 
  height="500" 
  frameborder="0" 
  style="border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
  allowtransparency="true">
</iframe>
```

## Anpassung

Das Widget kann angepasst werden durch:

- **Width/Height**: Ändere die Attribute im iframe-Tag
- **Styling**: Füge CSS-Klassen oder Inline-Styles hinzu
- **Responsive**: Das Widget passt sich automatisch an

## Features des Widgets

1. **Kompakte Ansicht**:
   - Coin Name & Symbol
   - Trust Score & Tier
   - Community Stats (Polls, Votes, Voters)
   - "View Full Community" Button

2. **Erweiterte Ansicht**:
   - Vollständige Community-Seite im iframe
   - "Open in New Tab" Option

3. **Attribution**:
   - "Powered by" Link (bitte behalten)

## Technische Details

- **Format**: iframe-basiert
- **CORS**: Erlaubt für alle Domains
- **Responsive**: Mobile-optimiert
- **Performance**: Lazy-loading, optimiert für schnelle Ladezeiten

## Support

Bei Fragen oder Problemen:
- Prüfe, ob die Coin-Mint-Adresse korrekt ist
- Stelle sicher, dass die Widget-URL erreichbar ist
- Teste in verschiedenen Browsern
