import bcrypt from 'bcryptjs';
import { db, resetDatabase } from './db.js';

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const AMENITIES = {
  base: ['Wifi', 'Kitchen', 'Free parking', 'Air conditioning'],
  luxury: ['Pool', 'Hot tub', 'Gym', 'Sea view', 'Breakfast included'],
};

function iso(offsetDays) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function insertListing(hostId, l) {
  const info = db
    .prepare(
      `INSERT INTO listings
        (host_id, title, description, type, city, country, address, lat, lng,
         price_per_night, guests, bedrooms, beds, baths, amenities, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      hostId,
      l.title,
      l.description,
      l.type,
      l.city,
      l.country,
      l.address,
      l.lat,
      l.lng,
      l.pricePerNight,
      l.guests,
      l.bedrooms,
      l.beds,
      l.baths,
      JSON.stringify(l.amenities),
      JSON.stringify(l.images)
    );
  return Number(info.lastInsertRowid);
}

function insertBooking({ listingId, guestId, checkIn, checkOut, guests, status = 'confirmed' }) {
  const listing = db.prepare('SELECT price_per_night FROM listings WHERE id = ?').get(listingId);
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
  const total = Math.round(nights * listing.price_per_night * 100) / 100;
  const info = db
    .prepare(
      `INSERT INTO bookings (listing_id, guest_id, check_in, check_out, guests, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(listingId, guestId, checkIn, checkOut, guests, total, status);
  return Number(info.lastInsertRowid);
}

function insertReview({ listingId, bookingId, guestId, rating, comment }) {
  db.prepare('INSERT INTO reviews (listing_id, booking_id, guest_id, rating, comment) VALUES (?, ?, ?, ?, ?)').run(
    listingId,
    bookingId,
    guestId,
    rating,
    comment
  );
}

async function main() {
  resetDatabase();

  const password = await bcrypt.hash('password123', 10);
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');

  const priya = Number(insertUser.run('Priya Sharma', 'host@demo.com', password, 'host').lastInsertRowid);
  const marco = Number(insertUser.run('Marco Rossi', 'marco@demo.com', password, 'host').lastInsertRowid);
  const aarav = Number(insertUser.run('Aarav Mehta', 'guest@demo.com', password, 'guest').lastInsertRowid);
  const lena = Number(insertUser.run('Lena Muller', 'lena@demo.com', password, 'guest').lastInsertRowid);

  const listings = [
    {
      hostId: priya,
      title: 'Sunlit Loft near Marine Drive',
      description:
        'A bright designer loft steps away from the sea face. Wake up to ocean breezes, work from the sunny reading nook, and watch the Queen’s Necklace light up in the evening.',
      type: 'loft',
      city: 'Mumbai',
      country: 'India',
      address: 'Marine Drive, Churchgate',
      lat: 18.943,
      lng: 72.823,
      pricePerNight: 4800,
      guests: 3,
      bedrooms: 1,
      beds: 2,
      baths: 1,
      amenities: [...AMENITIES.base, 'Sea view', 'Workspace'],
      images: [img('1502672260266-1c1ef2d93688'), img('1522708323590-d24dbb6b0267'), img('1560448204-e02f11c3d0e2')],
    },
    {
      hostId: priya,
      title: 'Goan Beach Villa with Private Pool',
      description:
        'A spacious villa a short walk from the sand. Cool off in the private pool, grill dinner under the stars, and enjoy the easy Goan pace with your whole group.',
      type: 'villa',
      city: 'Goa',
      country: 'India',
      address: 'Anjuna Beach Road',
      lat: 15.5735,
      lng: 73.7408,
      pricePerNight: 12500,
      guests: 8,
      bedrooms: 4,
      beds: 5,
      baths: 4,
      amenities: [...AMENITIES.base, ...AMENITIES.luxury],
      images: [img('1613490493576-7fde63acd811'), img('1512918728675-ed5a9ecdebfd'), img('1600585154340-be6161a56a0c')],
    },
    {
      hostId: marco,
      title: 'Himalayan Cabin Retreat',
      description:
        'A cosy timber cabin surrounded by deodar pines with valley views from every window. Perfect for slow mornings, bonfires, and treks into the mountains.',
      type: 'cabin',
      city: 'Manali',
      country: 'India',
      address: 'Old Manali, Himachal Pradesh',
      lat: 32.2432,
      lng: 77.1892,
      pricePerNight: 3200,
      guests: 4,
      bedrooms: 2,
      beds: 3,
      baths: 1,
      amenities: ['Wifi', 'Kitchen', 'Fireplace', 'Mountain view', 'Free parking'],
      images: [img('1449158743715-0a90ebb6d2d8'), img('1505691938895-1758d7feb511'), img('1493809842364-78817add7ffb')],
    },
    {
      hostId: marco,
      title: 'Modern Condo in Bandra',
      description:
        'A sleek high-floor condo in the heart of Bandra with a city skyline view, fast wifi, and cafés, boutiques and the sea link all within easy reach.',
      type: 'condo',
      city: 'Mumbai',
      country: 'India',
      address: 'Linking Road, Bandra West',
      lat: 19.0596,
      lng: 72.8295,
      pricePerNight: 6200,
      guests: 4,
      bedrooms: 2,
      beds: 2,
      baths: 2,
      amenities: [...AMENITIES.base, 'City view', 'Gym', 'Workspace'],
      images: [img('1560185007-cde436f6a4d0'), img('1502672023488-70e25813eb80'), img('1502672260266-1c1ef2d93688')],
    },
    {
      hostId: priya,
      title: 'Rustic Cottage in the Alps',
      description:
        'A storybook cottage with a garden, mountain views, and a wood-burning stove. A perfect base for hiking in summer and skiing in winter.',
      type: 'cottage',
      city: 'Interlaken',
      country: 'Switzerland',
      address: 'Unterseen',
      lat: 46.6863,
      lng: 7.8632,
      pricePerNight: 15800,
      guests: 5,
      bedrooms: 3,
      beds: 4,
      baths: 2,
      amenities: ['Wifi', 'Kitchen', 'Fireplace', 'Mountain view', 'Free parking', 'Garden'],
      images: [img('1505691938895-1758d7feb511'), img('1449158743715-0a90ebb6d2d8'), img('1512918728675-ed5a9ecdebfd')],
    },
    {
      hostId: marco,
      title: 'Tuscan Farmhouse Escape',
      description:
        'Rolling vineyard views, a sun-drenched terrace, and generous rooms in a restored stone farmhouse. Slow breakfasts and long lunches are mandatory here.',
      type: 'house',
      city: 'Florence',
      country: 'Italy',
      address: 'Chianti Hills',
      lat: 43.7696,
      lng: 11.2558,
      pricePerNight: 13400,
      guests: 6,
      bedrooms: 3,
      beds: 4,
      baths: 3,
      amenities: [...AMENITIES.base, 'Pool', 'Garden', 'Breakfast included'],
      images: [img('1600585154340-be6161a56a0c'), img('1613490493576-7fde63acd811'), img('1560448204-e02f11c3d0e2')],
    },
    {
      hostId: priya,
      title: 'Downtown Paris Apartment',
      description:
        'A charming apartment with parquet floors and tall windows in a classic Parisian building. Step out to bakeries, markets, and the metro.',
      type: 'apartment',
      city: 'Paris',
      country: 'France',
      address: 'Le Marais',
      lat: 48.8566,
      lng: 2.3522,
      pricePerNight: 11200,
      guests: 2,
      bedrooms: 1,
      beds: 1,
      baths: 1,
      amenities: ['Wifi', 'Kitchen', 'Heating', 'Workspace', 'City view'],
      images: [img('1522708323590-d24dbb6b0267'), img('1502672023488-70e25813eb80'), img('1502672260266-1c1ef2d93688')],
    },
    {
      hostId: marco,
      title: 'Bali Jungle Treehouse',
      description:
        'Wake up to birdsong in this handcrafted treehouse nestled in the jungle. An outdoor shower, a hanging deck, and a plunge pool complete the escape.',
      type: 'house',
      city: 'Ubud',
      country: 'Indonesia',
      address: 'Tegallalang',
      lat: -8.5069,
      lng: 115.2625,
      pricePerNight: 7600,
      guests: 2,
      bedrooms: 1,
      beds: 1,
      baths: 1,
      amenities: ['Wifi', 'Pool', 'Garden', 'Breakfast included', 'Jungle view'],
      images: [img('1512918728675-ed5a9ecdebfd'), img('1493809842364-78817add7ffb'), img('1613490493576-7fde63acd811')],
    },
    {
      hostId: priya,
      title: 'Desert Glass House',
      description:
        'A striking glass-walled villa in the Thar desert with an infinity pool, star-filled skies, and stunning sunrise views over the dunes.',
      type: 'villa',
      city: 'Jaisalmer',
      country: 'India',
      address: 'Sam Sand Dunes',
      lat: 26.9157,
      lng: 70.9083,
      pricePerNight: 9800,
      guests: 4,
      bedrooms: 2,
      beds: 3,
      baths: 2,
      amenities: [...AMENITIES.base, 'Pool', 'Desert view', 'Breakfast included'],
      images: [img('1600585154340-be6161a56a0c'), img('1449158743715-0a90ebb6d2d8'), img('1505691938895-1758d7feb511')],
    },
  ];

  const listingIds = listings.map((l) => insertListing(l.hostId, l));

  const reviewCopy = [
    'Absolutely stunning place — even better than the photos. Would stay again in a heartbeat.',
    'Great location and a very responsive host. Clean, comfortable, and well equipped.',
    'Lovely space with beautiful views. A couple of small things could be improved but overall a great stay.',
    'Perfect getaway. The check-in was smooth and the place felt like home.',
    'Incredible value for money. The neighbourhood is quiet and walkable.',
  ];
  const ratings = [5, 4, 5, 4, 3, 5, 4, 5, 4];

  listingIds.forEach((listingId, index) => {
    const guestId = index % 2 === 0 ? aarav : lena;
    const checkIn = iso(-45 + index);
    const checkOut = iso(-40 + index);
    const bookingId = insertBooking({ listingId, guestId, checkIn, checkOut, guests: 2 });
    db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(bookingId);
    insertReview({
      listingId,
      bookingId,
      guestId,
      rating: ratings[index],
      comment: reviewCopy[index % reviewCopy.length],
    });
  });

  insertBooking({ listingId: listingIds[0], guestId: aarav, checkIn: iso(10), checkOut: iso(14), guests: 2 });
  insertBooking({ listingId: listingIds[1], guestId: aarav, checkIn: iso(30), checkOut: iso(34), guests: 4 });

  const completedUnreviewed = insertBooking({
    listingId: listingIds[3],
    guestId: aarav,
    checkIn: iso(-12),
    checkOut: iso(-9),
    guests: 2,
  });
  db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(completedUnreviewed);

  console.log('Seed complete.');
  console.log('Host login:  host@demo.com  / password123');
  console.log('Guest login: guest@demo.com / password123');
  console.log(`Listings: ${listingIds.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
