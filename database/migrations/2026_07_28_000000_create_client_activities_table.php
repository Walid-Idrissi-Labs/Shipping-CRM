<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('description', 255)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('subject_type', 40)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['provider_id', 'created_at']);
            $table->index(['client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_activities');
    }
};
