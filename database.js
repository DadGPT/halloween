const { createClient } = require('@supabase/supabase-js');

class DatabaseService {
    constructor() {
        console.log('Initializing DatabaseService...');

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials!');
            console.error('SUPABASE_URL:', !!supabaseUrl);
            console.error('SUPABASE_ANON_KEY:', !!supabaseKey);
            throw new Error('Supabase credentials not configured');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log('DatabaseService initialized successfully');
    }

    // Get all contest entries
    async getEntries() {
        try {
            console.log('Fetching all contest entries from database...');
            const { data, error } = await this.supabase
                .from('contest_entries')
                .select('*')
                .order('uploaded_at', { ascending: false });

            if (error) {
                console.error('Error fetching entries:', error);
                throw error;
            }

            console.log(`Fetched ${data?.length || 0} entries from database`);
            return data || [];
        } catch (error) {
            console.error('Failed to get entries:', error.message);
            throw error;
        }
    }

    // Add a new contest entry
    async addEntry(entry) {
        try {
            console.log('Adding new entry to database:', entry.name);
            const { data, error } = await this.supabase
                .from('contest_entries')
                .insert([entry])
                .select()
                .single();

            if (error) {
                console.error('Error adding entry:', error);
                throw error;
            }

            console.log('Entry added successfully:', data.id);
            return data;
        } catch (error) {
            console.error('Failed to add entry:', error.message);
            throw error;
        }
    }

    // Update an existing entry (for voting)
    async updateEntry(id, updates) {
        try {
            console.log('Updating entry:', id);
            const { data, error } = await this.supabase
                .from('contest_entries')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating entry:', error);
                throw error;
            }

            console.log('Entry updated successfully');
            return data;
        } catch (error) {
            console.error('Failed to update entry:', error.message);
            throw error;
        }
    }

    // Increment vote for an entry in a specific category
    async addVote(entryId, category) {
        try {
            console.log(`Adding vote for entry ${entryId} in category: ${category}`);

            // First, get the current entry
            const { data: entry, error: fetchError } = await this.supabase
                .from('contest_entries')
                .select('votes')
                .eq('id', entryId)
                .single();

            if (fetchError) {
                console.error('Error fetching entry for vote:', fetchError);
                throw fetchError;
            }

            // Increment the vote count for the category
            const updatedVotes = { ...entry.votes };
            updatedVotes[category] = (updatedVotes[category] || 0) + 1;

            // Update the entry
            const { data, error: updateError } = await this.supabase
                .from('contest_entries')
                .update({ votes: updatedVotes })
                .eq('id', entryId)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating vote:', updateError);
                throw updateError;
            }

            console.log('Vote added successfully');
            return data;
        } catch (error) {
            console.error('Failed to add vote:', error.message);
            throw error;
        }
    }

    // Remove a vote for an entry in a specific category
    async removeVote(entryId, category) {
        try {
            console.log(`Removing vote for entry ${entryId} in category: ${category}`);

            // First, get the current entry
            const { data: entry, error: fetchError } = await this.supabase
                .from('contest_entries')
                .select('votes')
                .eq('id', entryId)
                .single();

            if (fetchError) {
                console.error('Error fetching entry for vote removal:', fetchError);
                throw fetchError;
            }

            // Decrement the vote count for the category (don't go below 0)
            const updatedVotes = { ...entry.votes };
            updatedVotes[category] = Math.max(0, (updatedVotes[category] || 0) - 1);

            // Update the entry
            const { data, error: updateError } = await this.supabase
                .from('contest_entries')
                .update({ votes: updatedVotes })
                .eq('id', entryId)
                .select()
                .single();

            if (updateError) {
                console.error('Error removing vote:', updateError);
                throw updateError;
            }

            console.log('Vote removed successfully');
            return data;
        } catch (error) {
            console.error('Failed to remove vote:', error.message);
            throw error;
        }
    }

    // Reset all votes
    async resetVotes() {
        try {
            console.log('Resetting all votes...');

            // Get all entries
            const { data: entries, error: fetchError } = await this.supabase
                .from('contest_entries')
                .select('id');

            if (fetchError) {
                console.error('Error fetching entries for reset:', fetchError);
                throw fetchError;
            }

            // Reset votes for each entry
            const resetVotes = { couple: 0, funny: 0, scary: 0, overall: 0 };

            for (const entry of entries) {
                await this.supabase
                    .from('contest_entries')
                    .update({ votes: resetVotes })
                    .eq('id', entry.id);
            }

            console.log(`Reset votes for ${entries.length} entries`);
            return true;
        } catch (error) {
            console.error('Failed to reset votes:', error.message);
            throw error;
        }
    }
}

module.exports = DatabaseService;
