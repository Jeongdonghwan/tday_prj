"""English love-horoscope constants (astrology frame, Co-Star-ish witty tone).

Mirrors constants.py structure so personalize.py can pick a language pack.
- SUN_SIGN_EN : 12 western sun signs (index = sun_sign_of order, 0=Aries)
- LUCKY_*     : lucky pools {emoji, name}
- TAROT_EN    : 22 major arcana (kr slot reused as EN name, en name, upright love meaning)
- COMP_COMMENTS_EN : 5 score bands (50s~90s) x 5 comments
"""

# 0=Aries ... 11=Pisces (matches kst.sun_sign_of)
SUN_SIGN_EN = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

LUCKY_COLORS_EN = [
    {"emoji": "🌸", "name": "Coral Pink"}, {"emoji": "💙", "name": "Sky Blue"},
    {"emoji": "🤍", "name": "Ivory"}, {"emoji": "💜", "name": "Lavender"},
    {"emoji": "❤️", "name": "Cherry Red"}, {"emoji": "💛", "name": "Lemon Yellow"},
    {"emoji": "🌿", "name": "Mint Green"}, {"emoji": "🧡", "name": "Apricot"},
    {"emoji": "🤎", "name": "Camel Beige"}, {"emoji": "🩷", "name": "Rose Pink"},
    {"emoji": "💚", "name": "Olive"}, {"emoji": "🖤", "name": "Charcoal"},
]

LUCKY_ITEMS_EN = [
    {"emoji": "🧸", "name": "Keyring"}, {"emoji": "📖", "name": "A Book"},
    {"emoji": "🎧", "name": "Earbuds"}, {"emoji": "🕯️", "name": "Scented Candle"},
    {"emoji": "☕️", "name": "Tumbler"}, {"emoji": "🌷", "name": "A Single Flower"},
    {"emoji": "💍", "name": "A Ring"}, {"emoji": "🧣", "name": "A Scarf"},
    {"emoji": "📷", "name": "Film Camera"}, {"emoji": "🍫", "name": "Chocolate"},
    {"emoji": "🪞", "name": "Pocket Mirror"}, {"emoji": "🎀", "name": "A Hair Clip"},
    {"emoji": "🧴", "name": "Hand Cream"}, {"emoji": "🖊️", "name": "Fountain Pen"},
    {"emoji": "🧢", "name": "A Ball Cap"}, {"emoji": "🌙", "name": "Moon Pendant"},
]

LUCKY_TIMES_EN = [
    {"emoji": "🌅", "name": "7 AM"}, {"emoji": "🕙", "name": "10 AM"},
    {"emoji": "🍽️", "name": "Noon"}, {"emoji": "🕒", "name": "3 PM"},
    {"emoji": "🌇", "name": "6 PM"}, {"emoji": "🕗", "name": "8 PM"},
    {"emoji": "🌃", "name": "10 PM"}, {"emoji": "🌙", "name": "Around Midnight"},
]

LUCKY_PLACES_EN = [
    {"emoji": "☕️", "name": "A Café"}, {"emoji": "🌳", "name": "The Park"},
    {"emoji": "📚", "name": "A Bookstore"}, {"emoji": "🎬", "name": "The Movies"},
    {"emoji": "🍜", "name": "A Food Spot"}, {"emoji": "🖼️", "name": "An Exhibition"},
    {"emoji": "🌊", "name": "Near the Sea"}, {"emoji": "🏞️", "name": "The Riverside"},
    {"emoji": "🛍️", "name": "Downtown"}, {"emoji": "🌸", "name": "A Neighborhood Walk"},
    {"emoji": "🍰", "name": "A Dessert Shop"}, {"emoji": "🚉", "name": "By the Station"},
]

# Major arcana 22 — (EN name (kr slot), EN name, upright love meaning)
TAROT_EN = [
    ("THE FOOL", "THE FOOL", "A card that says leap without overthinking. An open, uncalculated heart opens an unexpected door."),
    ("THE MAGICIAN", "THE MAGICIAN", "Speak first and it lands. One line from you can move their whole mood today."),
    ("THE HIGH PRIESTESS", "THE HIGH PRIESTESS", "Read the room before rushing. The answer is hiding in the quiet."),
    ("THE EMPRESS", "THE EMPRESS", "Warmth is your charm today. Small acts of care make the connection bloom."),
    ("THE EMPEROR", "THE EMPEROR", "Steadiness builds trust. Keeping your word is what opens their heart."),
    ("THE HIEROPHANT", "THE HIEROPHANT", "A serious talk clicks today. You grow closer where your values meet."),
    ("THE LOVERS", "THE LOVERS", "Butterflies peak. Just being together pulls two hearts nearer."),
    ("THE CHARIOT", "THE CHARIOT", "Drop the hesitation and go straight for it. Courage steers things your way."),
    ("STRENGTH", "STRENGTH", "Gentle beats pushy. Patient warmth melts their guard down."),
    ("THE HERMIT", "THE HERMIT", "Alone-time sorts your feelings out. No need to rush anything today."),
    ("WHEEL OF FORTUNE", "WHEEL OF FORTUNE", "An unexpected turn brings someone in. Stay open to a chance encounter."),
    ("JUSTICE", "JUSTICE", "Honesty sets the record straight. Time to share what you've been holding."),
    ("THE HANGED MAN", "THE HANGED MAN", "Flip your view for a sec. From their side, the misunderstanding untangles itself."),
    ("DEATH", "DEATH", "Let an old attachment go and someone new walks in. Every ending is a start."),
    ("TEMPERANCE", "TEMPERANCE", "Balance over games. The right distance and warmth keep it lasting."),
    ("THE DEVIL", "THE DEVIL", "Strong pull, but watch the obsession. Tell comfort and possessiveness apart today."),
    ("THE TOWER", "THE TOWER", "A sudden shift reveals real feelings. Shaken but honest turns out sturdier."),
    ("THE STAR", "THE STAR", "Hope sparkles. A thrilling step closer to the connection you've wanted."),
    ("THE MOON", "THE MOON", "Emotions run sensitive. Choose their voice over a text to check in."),
    ("THE SUN", "THE SUN", "A bright, easy day. Laughing together lights the two of you up."),
    ("JUDGEMENT", "JUDGEMENT", "A connection worth facing again. Close old feelings and the answer sharpens."),
    ("THE WORLD", "THE WORLD", "A chapter completes. What you built settles into a steady kind of love."),
]

COMP_COMMENTS_EN = [
    [  # 50s — needs effort
        "Still the getting-to-know-you stage. Don't rush and you'll drift closer.",
        "A day of different speeds. Respect their tempo and the friction fades.",
        "Your styles clash a bit. Today, listening beats talking.",
        "Less instant chemistry, more time. Give it room and watch.",
        "Small courtesies make a big difference. Try stepping back first.",
    ],
    [  # 60s — easygoing
        "A quietly compatible pair. Comfort is what keeps you connected.",
        "Everyday chatter clicks better than any big event today.",
        "Natural chemistry with no effort. A low-key date suits today.",
        "Fun in matching each other's tastes. Try something new together.",
        "Steady flow. Don't rush to define it and it stays easy.",
    ],
    [  # 70s — good
        "Conversation just flows. Today's talk deepens the bond.",
        "You lose track of time together. Your senses of humor line up.",
        "Your differences turn into charm today. The pull feels natural.",
        "A crush can become certainty. A good day to say it out loud.",
        "Tastes and rhythms match. Make a plan to do something together.",
    ],
    [  # 80s — very good
        "You get each other without words. Hearts move closer today.",
        "Butterflies and comfort at once — top-tier chemistry. A laughing kind of day.",
        "You bring out the best in each other. Today's date will stick with you.",
        "Even the timing lines up. Good day to bring up what you've put off.",
        "You feel settled around them. A perfect day to be sincere.",
    ],
    [  # 90s — fated
        "Flawlessly in sync today. Anything you do together is fun.",
        "You become each other's luck. Together, everything works out.",
        "Butterflies at their peak. One line today closes the gap fast.",
        "Hearts point the same way. Don't miss it — say how you feel.",
        "Chemistry that fits like fate. Today's moment becomes special.",
    ],
]
