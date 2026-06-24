<?php

use App\Http\Controllers\Api\AccountRequestController;
use App\Http\Controllers\Api\AffectationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AvoirController;
use App\Http\Controllers\Api\ChauffeurController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FactureController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\ProviderSettingController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\QuoteRequestController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\VehiculeController;
use Illuminate\Support\Facades\Route;

// Public auth
Route::post('/auth/login', [AuthController::class, 'login']);

// Public tracking
Route::get('/shipments/{number}/tracking', [TrackingController::class, 'publicTrack']);

// Public account request
Route::post('/account-requests', [AccountRequestController::class, 'store']);

// Public quote request (creates a Demande de Devis, not a Quote)
Route::post('/quote-requests', [QuoteRequestController::class, 'store']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/reset-password', [PasswordController::class, 'resetClientPassword']);

    // Provider-only
    Route::middleware('role:prestataire')->group(function () {
        Route::get('/dashboard/provider', [DashboardController::class, 'provider']);

        Route::get('/provider/settings', [ProviderSettingController::class, 'show']);
        Route::patch('/provider/settings', [ProviderSettingController::class, 'update']);
        Route::post('/provider/logo', [ProviderSettingController::class, 'uploadLogo']);
        Route::patch('/provider/change-password', [PasswordController::class, 'changeProviderPassword']);

        Route::apiResource('clients', ClientController::class);
        Route::get('/clients/{client}/missions', [AffectationController::class, 'byClient']);

        Route::apiResource('quote-requests', QuoteRequestController::class)->only(['index', 'show', 'destroy']);
        Route::patch('/quote-requests/{quoteRequest}/treat', [QuoteRequestController::class, 'markAsTreated']);
        Route::post('/quote-requests/{quoteRequest}/create-quote', [QuoteController::class, 'createFromRequest']);

        Route::apiResource('quotes', QuoteController::class)->except(['store']);
        Route::post('/quotes', [QuoteController::class, 'store']);
        Route::patch('/quotes/{quote}/status', [QuoteController::class, 'updateStatus']);

        Route::apiResource('shipments', ShipmentController::class);
        Route::get('/shipments/{shipment}/timeline', [TrackingController::class, 'timeline']);
        Route::post('/shipments/{shipment}/tracking', [TrackingController::class, 'store']);
        Route::delete('/tracking-events/{suiviStatut}', [TrackingController::class, 'destroy']);
        Route::get('/shipments/{shipment}/label', [ShipmentController::class, 'label']);
        Route::get('/shipments/{shipment}/label-inline', [ShipmentController::class, 'labelInline']);
        Route::get('/shipments/{shipment}/label-preview', [ShipmentController::class, 'labelPreview']);

        Route::get('/account-requests', [AccountRequestController::class, 'index']);
        Route::get('/account-requests/{accountRequest}', [AccountRequestController::class, 'show']);
        Route::patch('/account-requests/{accountRequest}/approve', [AccountRequestController::class, 'approve']);
        Route::delete('/account-requests/{accountRequest}', [AccountRequestController::class, 'destroy']);

        Route::get('/invoices/unbilled-shipments', [FactureController::class, 'unbilledShipments']);
        Route::get('/invoices/next-number', [FactureController::class, 'nextNumber']);
        Route::post('/invoices/preview', [FactureController::class, 'preview']);
        Route::apiResource('invoices', FactureController::class)->except(['update', 'show', 'destroy']);
        Route::get('/invoices/{facture}', [FactureController::class, 'show']);
        Route::delete('/invoices/{facture}', [FactureController::class, 'destroy']);
        Route::patch('/invoices/{facture}/status', [FactureController::class, 'updateStatus']);
        Route::get('/invoices/{facture}/pdf', [FactureController::class, 'pdf']);
        Route::get('/invoices/by-client/{client}', [FactureController::class, 'byClient']);

        Route::apiResource('credit-notes', AvoirController::class)->except(['update', 'destroy']);
        Route::get('/credit-notes/{avoir}/pdf', [AvoirController::class, 'pdf']);

        Route::get('/dashboard/fleet', [DashboardController::class, 'fleet']);

        Route::get('/vehicles/available', [VehiculeController::class, 'available']);
        Route::apiResource('vehicles', VehiculeController::class);

        Route::get('/drivers/active', [ChauffeurController::class, 'active']);
        Route::apiResource('drivers', ChauffeurController::class);

        Route::get('/assignments/today', [AffectationController::class, 'today']);
        Route::get('/assignments/unassigned-shipments', [AffectationController::class, 'unassignedShipments']);
        Route::patch('/assignments/{assignment}/status', [AffectationController::class, 'updateStatus']);
        Route::apiResource('assignments', AffectationController::class);
    });

    // Client-only
    Route::middleware('role:client')->group(function () {
        Route::get('/dashboard/client', [DashboardController::class, 'client']);
        Route::get('/my/shipments', [ShipmentController::class, 'index']);
        Route::get('/my/invoices', [FactureController::class, 'index']);
        Route::get('/my/invoices/{facture}', [FactureController::class, 'show']);
        Route::get('/my/invoices/{facture}/pdf', [FactureController::class, 'pdf']);
        Route::patch('/client/profile', [ClientController::class, 'updateOwnProfile']);
        Route::post('/client/change-password', [PasswordController::class, 'changeClientPassword']);
    });
});

Route::get('/up', function () {
    return response()->json(['status' => 'ok']);
});
