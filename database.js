const { createClient } = require('@supabase/supabase-js');

class DatabaseService {
    constructor() {
        console.log('Initializing DatabaseService...');
        console.log('Environment check:');
        console.log('- SUPABASE_URL present:', !!process.env.SUPABASE_URL);
        console.log('- SUPABASE_ANON_KEY present:', !!process.env.SUPABASE_ANON_KEY);

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            const errorMsg = 'Missing Supabase credentials. Database functionality will be limited.';
            console.warn(errorMsg);
            console.warn('SUPABASE_URL:', supabaseUrl ? 'present' : 'MISSING');
            console.warn('SUPABASE_ANON_KEY:', supabaseKey ? 'present' : 'MISSING');

            // Don't throw - just set initialized flag to false
            this.initialized = false;
            this.supabase = null;
            return;
        }

        try {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            this.initialized = true;
            console.log('DatabaseService initialized successfully');
        } catch (error) {
            console.error('Error creating Supabase client:', error.message);
            this.initialized = false;
            this.supabase = null;
        }
    }

    // Get all contest entries
    async getEntries() {
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

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
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

        try {
            console.log('Adding new entry to database:', entry.name);
            console.log('Entry to insert:', JSON.stringify(entry, null, 2));

            const { data, error } = await this.supabase
                .from('contest_entries')
                .insert([entry])
                .select()
                .single();

            if (error) {
                console.error('Supabase insert error:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                console.error('Error details:', error.details);
                console.error('Error hint:', error.hint);
                throw error;
            }

            console.log('Entry added successfully:', data.id);
            console.log('Returned data:', JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error('Failed to add entry - caught exception:', error.message);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    // Update an existing entry (for voting)
    async updateEntry(id, updates) {
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

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

    // Delete an entry
    async deleteEntry(id) {
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

        try {
            console.log('Deleting entry:', id);
            const { error } = await this.supabase
                .from('contest_entries')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting entry:', error);
                throw error;
            }

            console.log('Entry deleted successfully');
            return true;
        } catch (error) {
            console.error('Failed to delete entry:', error.message);
            throw error;
        }
    }

    // Delete all entries
    async deleteAllEntries() {
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

        try {
            console.log('Deleting all contest entries...');

            // Get count before deletion
            const { count: beforeCount } = await this.supabase
                .from('contest_entries')
                .select('*', { count: 'exact', head: true });

            console.log(`Found ${beforeCount} entries to delete`);

            // Delete all entries from contest_entries table
            // This will also cascade delete related votes due to foreign key constraint
            const { error } = await this.supabase
                .from('contest_entries')
                .delete()
                .neq('id', 0); // Delete where id != 0 (which matches all rows)

            if (error) {
                console.error('Error deleting all entries:', error);
                throw error;
            }

            console.log(`Successfully deleted all ${beforeCount} entries`);
            return { success: true, deletedCount: beforeCount };
        } catch (error) {
            console.error('Failed to delete all entries:', error.message);
            throw error;
        }
    }

    // Increment vote for an entry in a specific category
    async addVote(entryId, category) {
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

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
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

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
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

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

    // Get votes for a specific voter
    async getVoterVotes(voterId) {
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

        try {
            console.log(`Getting votes for voter: ${voterId}`);
            const { data, error } = await this.supabase
                .from('costume_votes')
                .select('*')
                .eq('voter_id', voterId);

            if (error) {
                console.error('Error fetching voter votes:', error);
                throw error;
            }

            console.log(`Found ${data?.length || 0} votes for voter`);
            return data || [];
        } catch (error) {
            console.error('Failed to get voter votes:', error.message);
            throw error;
        }
    }

    // Submit or update a vote
    async submitVote(voterId, entryId, category) {
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

        try {
            console.log(`Submitting vote: voter=${voterId}, entry=${entryId}, category=${category}`);

            // Use upsert to insert or update if vote already exists
            const { data, error } = await this.supabase
                .from('costume_votes')
                .upsert(
                    {
                        voter_id: voterId,
                        entry_id: entryId,
                        category: category,
                        voted_at: new Date().toISOString()
                    },
                    {
                        onConflict: 'voter_id,category',
                        ignoreDuplicates: false
                    }
                )
                .select()
                .single();

            if (error) {
                console.error('Error submitting vote:', error);
                throw error;
            }

            console.log('Vote submitted successfully');

            // Also update the vote count on the contest entry
            await this.addVote(entryId, category);

            return data;
        } catch (error) {
            console.error('Failed to submit vote:', error.message);
            throw error;
        }
    }

    // Delete a vote
    async deleteVote(voterId, category) {
        if (!this.initialized || !this.supabase) {
            throw new Error('Database service not initialized. Check Supabase credentials.');
        }

        try {
            console.log(`Deleting vote: voter=${voterId}, category=${category}`);

            // First get the vote to know which entry to decrement
            const { data: vote, error: fetchError } = await this.supabase
                .from('costume_votes')
                .select('entry_id')
                .eq('voter_id', voterId)
                .eq('category', category)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                console.error('Error fetching vote for deletion:', fetchError);
                throw fetchError;
            }

            if (vote) {
                // Remove the vote from costume_votes table
                const { error: deleteError } = await this.supabase
                    .from('costume_votes')
                    .delete()
                    .eq('voter_id', voterId)
                    .eq('category', category);

                if (deleteError) {
                    console.error('Error deleting vote:', deleteError);
                    throw deleteError;
                }

                // Decrement the vote count on the entry
                await this.removeVote(vote.entry_id, category);

                console.log('Vote deleted successfully');
                return true;
            }

            console.log('No vote found to delete');
            return false;
        } catch (error) {
            console.error('Failed to delete vote:', error.message);
            throw error;
        }
    }
}

module.exports = DatabaseService;
