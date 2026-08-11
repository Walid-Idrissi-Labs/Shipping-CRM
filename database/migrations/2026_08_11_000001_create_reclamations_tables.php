<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reclamations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('reference', 20)->unique();

            // string, not enum. Widening an enum on the production MySQL host
            // needs its own migration -- there are already two of those in this
            // directory -- and both of these sets are the kind that grows
            // (a "suggestion" type, an "escaladee" status). Validation lives in
            // the controllers, which is where the French labels live anyway.
            $table->string('type', 20);
            $table->string('statut', 20)->default('ouverte');

            $table->string('sujet', 150);

            // Deliberately not a foreign key: the target is either a shipment
            // or a facture, and a client may open a reclamation about an
            // expedition that is later deleted. A dangling id resolves to a
            // null label rather than breaking the thread -- the conversation
            // is the record that matters, the link is a convenience.
            $table->string('subject_type', 20)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();

            // Denormalised so the inbox can sort by activity without a join.
            $table->timestamp('last_message_at')->nullable();

            // Read watermarks, one per side: the id of the newest message that
            // side has seen. Unread is "messages from the other side with a
            // higher id", which needs no counter to keep in sync.
            //
            // An id and not a timestamp. `timestamp()` columns hold whole
            // seconds, so a message written in the same second as the other
            // side's read mark compares as not-newer and never shows as unread
            // -- the badge silently fails exactly when both sides are active at
            // once. Ids are monotonic and involve no clock. Not a foreign key:
            // this is a watermark, not a reference, and the messages cascade
            // away with the thread anyway.
            $table->unsignedBigInteger('client_read_message_id')->nullable();
            $table->unsignedBigInteger('provider_read_message_id')->nullable();

            $table->timestamps();

            $table->index(['provider_id', 'statut', 'last_message_at']);
            $table->index(['client_id', 'last_message_at']);
        });

        Schema::create('reclamation_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reclamation_id')->constrained('reclamations')->cascadeOnDelete();

            // Nullable: a message outlives the user account that wrote it, and
            // author_role below is what the UI actually renders.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('author_role', 20);

            $table->text('corps');

            // Messages are immutable, so there is nothing for updated_at to say.
            $table->timestamp('created_at')->useCurrent();

            $table->index(['reclamation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reclamation_messages');
        Schema::dropIfExists('reclamations');
    }
};
