require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const users = [
    {
        email: 'merchant@corre.app',
        password: 'password123',
        user_metadata: {
            full_name: 'Marcos Merchant',
            neighborhood: 'Centro',
            is_merchant: true,
            language_preference: 'pt'
        }
    },
    {
        email: 'runner@corre.app',
        password: 'password123',
        user_metadata: {
            full_name: 'Rachel Runner',
            neighborhood: 'Jardins',
            is_merchant: false,
            language_preference: 'en'
        }
    },
    {
        email: 'newbie@corre.app',
        password: 'password123',
        user_metadata: {
            full_name: 'Nelson Newbie',
            neighborhood: 'Copacabana',
            is_merchant: false,
            language_preference: 'pt'
        }
    },
    {
        email: 'elite@corre.app',
        password: 'password123',
        user_metadata: {
            full_name: 'Ana Silva',
            neighborhood: 'Foz',
            is_merchant: false,
            language_preference: 'pt'
        }
    },
    {
        email: 'coach@corre.app',
        password: 'password123',
        user_metadata: {
            full_name: 'Coach Pedro',
            neighborhood: 'Matosinhos',
            is_merchant: false,
            language_preference: 'pt'
        }
    }
];

async function seed() {
    console.log('🌱 Starting rich seed process...');

    const createdUsers = [];

    // 1. Create Users
    console.log('Creating users...');
    for (const user of users) {
        // Check if user exists first to avoid errors
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let userId = existingUsers.users.find(u => u.email === user.email)?.id;

        if (!userId) {
            const { data, error } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                user_metadata: user.user_metadata,
                email_confirm: true
            });

            if (error) {
                console.error(`Error creating user ${user.email}:`, error.message);
            } else {
                console.log(`Created user: ${user.email}`);
                userId = data.user.id;
            }
        } else {
            console.log(`User already exists: ${user.email}`);
        }

        if (userId) {
            createdUsers.push({ ...user, id: userId });
        }
    }

    if (createdUsers.length === 0) {
        console.error('No users created. Aborting.');
        return;
    }

    // 2. Create Events
    console.log('Creating events...');
    const merchantId = createdUsers.find(u => u.email === 'merchant@corre.app')?.id;
    const coachId = createdUsers.find(u => u.email === 'coach@corre.app')?.id;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    const eventsData = [
        {
            title: 'Monday Morning Run',
            description: 'Start your week with a 5k run around the park.',
            event_type: 'routine',
            points_value: 3,
            event_datetime: tomorrow.toISOString(),
            location_lat: 41.1579, // Porto
            location_lng: -8.6291,
            location_name: 'Parque da Cidade',
            check_in_radius_meters: 300,
            creator_id: merchantId
        },
        {
            title: 'City Marathon Qualifier',
            description: 'Official qualifier race for the city marathon.',
            event_type: 'race',
            points_value: 10,
            event_datetime: nextWeek.toISOString(),
            location_lat: 41.1579,
            location_lng: -8.6291,
            location_name: 'City Center Start Line',
            check_in_radius_meters: 500,
            creator_id: merchantId
        },
        {
            title: 'Sunday Long Run',
            description: '20km easy pace run for endurance.',
            event_type: 'special',
            points_value: 5,
            event_datetime: nextWeek.toISOString(),
            location_lat: 41.1785, // Matosinhos
            location_lng: -8.6963,
            location_name: 'Matosinhos Beach',
            check_in_radius_meters: 300,
            creator_id: coachId
        }
    ];

    const createdEvents = [];
    for (const event of eventsData) {
        const { data, error } = await supabase
            .from('events')
            .upsert(event, { onConflict: 'title', ignoreDuplicates: false }) // Use upsert to avoid duplicates but simple insert is also fine if we cleaned up
            .select()
            .maybeSingle(); // Use maybeSingle to handle potential issues

        // Simpler approach: just insert and ignore error or handle
        // To avoid complex duplicate logic in this simple script, we just try insert. 
        // But upsert with 'onConflict' requires a constraint name usually. 
        // Let's stick to insert and catch error.

        const { data: newData, error: insertError } = await supabase.from('events').insert(event).select().single();

        if (insertError) {
            // Assuming it might fail if constraints exist, but we don't have unique title constraint.
            console.log(`Event might already exist or error: ${insertError.message}`);
        } else {
            createdEvents.push(newData);
        }
    }
    console.log(`Events processing done.`);

    // 3. Create Marketplace Items
    console.log('Creating marketplace items...');
    const runnerId = createdUsers.find(u => u.email === 'runner@corre.app')?.id;
    const itemsData = [
        {
            seller_id: runnerId,
            title: 'Nike Vaporfly Next% 2',
            description: 'Used only twice. Size 42.',
            price: 150.00,
            image_url: 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/57c6179e-4e4c-4e4b-8493-27c5952003c0/vaporfly-3-road-racing-shoes-xsDgvM.png',
            category: 'Shoes',
            status: 'active'
        },
        {
            seller_id: runnerId,
            title: 'Garmin Forerunner 245',
            description: 'Good condition, minor scratches on bezel.',
            price: 120.00,
            image_url: null,
            category: 'Electronics',
            status: 'active'
        }
    ];

    for (const item of itemsData) {
        await supabase.from('marketplace_items').insert(item);
    }
    console.log('Marketplace items created.');

    // 4. Create Feed Posts (Social Population)
    console.log('Creating rich social feed...');

    // IDs
    const rachelId = createdUsers.find(u => u.email === 'runner@corre.app')?.id;
    const nelsonId = createdUsers.find(u => u.email === 'newbie@corre.app')?.id;
    const anaId = createdUsers.find(u => u.email === 'elite@corre.app')?.id;
    const pedroId = createdUsers.find(u => u.email === 'coach@corre.app')?.id;

    const postsData = [
        {
            user_id: rachelId,
            activity_type: 'run',
            content: 'Just crushed my 10k PR! 🏃‍♂️💨 The weather was perfect today.',
            media_url: 'https://images.unsplash.com/photo-1552674605-dfd48386377f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            meta_data: { distance: '10.5km', time: '52:30', pace: '5:00/km' },
            created_at: new Date().toISOString()
        },
        {
            user_id: nelsonId,
            activity_type: 'post',
            content: 'Just bought my first pair of serious running shoes! Can\'t wait to join the Sunday run.',
            media_url: null,
            meta_data: null,
            created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
            user_id: anaId,
            activity_type: 'run',
            content: 'Morning intervals at the track. Getting ready for the Marathon!',
            media_url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            meta_data: { distance: '12km', time: '1:05:00', pace: '4:15/km' },
            created_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        },
        {
            user_id: pedroId,
            activity_type: 'check_in',
            content: 'Checking in at Parque da Cidade for the group training session. Don\'t be late!',
            media_url: null,
            meta_data: { location: 'Parque da Cidade', event_id: createdEvents[0]?.id }, // Link to first event if exists
            created_at: new Date(Date.now() - 86400000).toISOString() // 24 hours ago
        },
        {
            user_id: rachelId,
            activity_type: 'post',
            content: 'Anyone have recommendations for a good physiotherapist in Box area?',
            media_url: null,
            meta_data: null,
            created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
        },
        {
            user_id: anaId,
            activity_type: 'run',
            content: 'Easy recovery run along the river via boardwalk. Beautiful sunset.',
            media_url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            meta_data: { distance: '6km', time: '35:00', pace: '5:50/km' },
            created_at: new Date(Date.now() - 200000000).toISOString() // ~2 days ago
        }
    ];

    for (const post of postsData) {
        const { error } = await supabase.from('feed_posts').insert(post);
        if (error) console.error('Error creating post:', error.message);
    }
    console.log(`Created ${postsData.length} social feed posts.`);

    console.log('✅ Rich Seeding complete!');
    console.log('New Test Accounts:');
    console.log(`- ${users[3].email} (Elite Runner)`);
    console.log(`- ${users[4].email} (Coach)`);
}

seed().catch(console.error);
