-- Update subscription plans with Slovenian content
UPDATE public.subscription_plans SET 
  description = 'Popolno za začetek analize sanj',
  features = '["5 AI analiz sanj na mesec", "Osnovni dnevnik sanj", "Sledenje datumov sanj", "Beleženje razpoloženja"]'::jsonb
WHERE name = 'Free';

UPDATE public.subscription_plans SET 
  description = 'Idealno za redno beleženje sanj',
  features = '["25 AI analiz sanj na mesec", "Vse funkcije brezplačnega načrta", "Oznake in kategorije sanj", "Mesečni vpogledi v vzorce", "E-poštna podpora"]'::jsonb
WHERE name = 'Basic';

UPDATE public.subscription_plans SET 
  description = 'Za resne ljubitelje sanj',
  features = '["Neomejene AI analize sanj", "Vse funkcije osnovnega načrta", "Napredno prepoznavanje vzorcev", "Podrobna analitična nadzorna plošča", "Slovar simbolov sanj", "Prednostna podpora", "Možnosti izvoza"]'::jsonb
WHERE name = 'Premium';