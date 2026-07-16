<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('shipment_id')->constrained('shipments')->cascadeOnDelete();
            $table->string('old_status')->nullable();
            $table->string('new_status')->nullable();
            $table->string('old_sub_status')->nullable();
            $table->string('new_sub_status')->nullable();
            $table->string('description', 60)->nullable();
            $table->timestamp('changed_at');
            $table->timestamps();

            $table->index(['employee_id', 'changed_at']);
            $table->index(['shipment_id', 'changed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_shipments');
    }
};