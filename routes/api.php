<?php

use App\Http\Controllers\Api\AccountRequestController;
use App\Http\Controllers\Api\AdminEmployeeController;
use App\Http\Controllers\Api\AffectationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AvoirController;
use App\Http\Controllers\Api\ChauffeurController;
use App\Http\Controllers\Api\ClientActivityController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ClientQuoteController;
use App\Http\Controllers\Api\ClientQuoteRequestController;
use App\Http\Controllers\Api\ClientShipmentController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeController;
use App\Http\Controllers\Api\ExpeditionRequestController;
use App\Http\Controllers\Api\FactureController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\ProviderSettingController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\QuoteRequestController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\SousEtapeController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\VehiculeController;
use Illuminate\Support\Facades\Route;

// Public auth. The login endpoint throttles itself per account+IP inside the
// controller so that only *failed* attempts count -- see AuthController.
Route::post('/auth/login', [AuthController::class, 'login']);

// Public tracking
Route::middleware('throttle:public-tracking')->group(function () {
    Route::get('/shipments/{number}/tracking', [TrackingController::class, 'publicTrack']);
});

// Public, unauthenticated write endpoints. Rate limits defined in AppServiceProvider.
Route::middleware('throttle:public-forms')->group(function () {
    // Public account request
    Route::post('/account-requests', [AccountRequestController::class, 'store']);

    // Public quote request (creates a Demande de Devis, not a Quote)
    Route::post('/quote-requests', [QuoteRequestController::class, 'store']);

    // Public expedition request (complete expedition form via token)
    Route::post('/expedition-requests/complete/{token}', [ExpeditionRequestController::class, 'storePublic']);
});

Route::get('/expedition-requests/complete/{token}', [ExpeditionRequestController::class, 'showPublic']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

// Employe-only
        Route::middleware('role:employe')->group(function () {
            Route::post('/employe/shipments/by-number', [EmployeController::class, 'findByNumber']);
            Route::get('/employe/shipments/{shipment}', [EmployeController::class, 'show']);
            Route::post('/employe/shipments/{shipment}/tracking', [EmployeController::class, 'storeTracking']);
            Route::get('/employe/history', [EmployeController::class, 'history']);
        });

        // Provider-only
        Route::middleware('role:prestataire')->group(function () {
        Route::get('/dashboard/provider', [DashboardController::class, 'provider']);
        Route::get('/dashboard/pending-counts', [DashboardController::class, 'pendingCounts']);
        Route::get('/client-activities', [ClientActivityController::class, 'index']);

        Route::get('/provider/settings', [ProviderSettingController::class, 'show']);
        Route::patch('/provider/settings', [ProviderSettingController::class, 'update']);
        Route::post('/provider/logo', [ProviderSettingController::class, 'uploadLogo']);
        Route::patch('/provider/change-password', [PasswordController::class, 'changeProviderPassword'])
            ->middleware('throttle:password-change');

        Route::apiResource('clients', ClientController::class);
        Route::get('/clients/{client}/missions', [AffectationController::class, 'byClient']);
        Route::get('/clients/{client}/shipments', [ShipmentController::class, 'byClient']);
        Route::get('/clients/{client}/invoices-entries', [FactureController::class, 'entriesByClient']);

        Route::apiResource('quote-requests', QuoteRequestController::class)->only(['index', 'show', 'destroy']);
        Route::patch('/quote-requests/{quoteRequest}/treat', [QuoteRequestController::class, 'markAsTreated']);
        Route::post('/quote-requests/{quoteRequest}/reject', [QuoteRequestController::class, 'reject']);
        Route::post('/quote-requests/{quoteRequest}/create-quote', [QuoteController::class, 'createFromRequest']);

Route::apiResource('quotes', QuoteController::class)->except(['store']);
Route::post('/quotes', [QuoteController::class, 'store']);
Route::patch('/quotes/{quote}/status', [QuoteController::class, 'updateStatus']);
Route::post('/quotes/{quote}/generate-link', [QuoteController::class, 'generateLink']);
Route::post('/quotes/{quote}/cancel-link', [QuoteController::class, 'cancelLink']);

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
        Route::delete('/account-requests/{accountRequest}/force', [AccountRequestController::class, 'forceDelete']);

        Route::get('/invoices/unbilled-shipments', [FactureController::class, 'unbilledShipments']);
        Route::get('/invoices/next-number', [FactureController::class, 'nextNumber']);
        Route::post('/invoices/preview', [FactureController::class, 'preview']);
        Route::apiResource('invoices', FactureController::class)->except(['update', 'show', 'destroy']);
        Route::get('/invoices/{facture}', [FactureController::class, 'show']);
        Route::delete('/invoices/{facture}', [FactureController::class, 'destroy']);
        Route::patch('/invoices/{facture}/status', [FactureController::class, 'updateStatus']);
        Route::get('/invoices/{facture}/pdf', [FactureController::class, 'pdf']);
        Route::get('/invoices/by-client/{client}', [FactureController::class, 'byClient']);

        Route::apiResource('credit-notes', AvoirController::class)
            ->parameters(['credit-notes' => 'avoir'])
            ->except(['update']);
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

Route::apiResource('expedition-requests', ExpeditionRequestController::class)->only(['index', 'show']);
Route::post('/expedition-requests/{expeditionRequest}/accept', [ExpeditionRequestController::class, 'accept']);
Route::post('/expedition-requests/{expeditionRequest}/reject', [ExpeditionRequestController::class, 'reject']);

Route::post('/shipments/{shipment}/sous-etapes', [SousEtapeController::class, 'store']);
        Route::delete('/sous-etapes/{sous_etape}', [SousEtapeController::class, 'destroy']);

        // Admin Employee Management
        Route::prefix('admin')->group(function () {
            // Literal segments must be registered before the resource routes: Laravel
            // matches in registration order, so /employes/transactions would otherwise
            // bind "transactions" as the {employe} id and 404 on the model lookup.
            Route::get('/employes/transactions', [AdminEmployeeController::class, 'allTransactions']);
            Route::get('/employes/{employe}/transactions', [AdminEmployeeController::class, 'transactions']);
            Route::apiResource('employes', AdminEmployeeController::class)->except(['update']);
            Route::patch('/employes/{employe}', [AdminEmployeeController::class, 'update']);
        });
    });

    // Client-only
    Route::middleware('role:client')->group(function () {
        Route::get('/dashboard/client', [DashboardController::class, 'client']);
        Route::get('/my/shipments', [ShipmentController::class, 'index']);
        Route::get('/my/invoices', [FactureController::class, 'index']);
        Route::get('/my/invoices/{facture}', [FactureController::class, 'show']);
        Route::get('/my/invoices/{facture}/pdf', [FactureController::class, 'pdf']);
        Route::patch('/client/profile', [ClientController::class, 'updateOwnProfile']);
        Route::post('/client/change-password', [PasswordController::class, 'changeClientPassword'])
            ->middleware('throttle:password-change');

        Route::get('my/expeditions', [ClientShipmentController::class, 'index']);
        Route::post('my/expeditions', [ClientShipmentController::class, 'store']);
        Route::get('my/expeditions/{shipment}', [ClientShipmentController::class, 'show']);
        Route::get('/my/expeditions/{shipment}/timeline', [TrackingController::class, 'timeline']);
        Route::get('/my/expeditions/{shipment}/label', [ShipmentController::class, 'label']);
        Route::get('/my/expeditions/{shipment}/label-preview', [ShipmentController::class, 'labelPreview']);
        Route::get('/my/expeditions/{shipment}/label-inline', [ShipmentController::class, 'labelInline']);

        Route::get('my/quotes', [ClientQuoteController::class, 'index']);
        Route::get('my/quotes/{quote}', [ClientQuoteController::class, 'show']);
        Route::patch('/my/quotes/{quote}/status', [ClientQuoteController::class, 'updateStatus']);

        Route::get('my/quote-requests', [ClientQuoteRequestController::class, 'index']);
        Route::post('my/quote-requests', [ClientQuoteRequestController::class, 'store']);
        Route::get('my/quote-requests/{quote_request}', [ClientQuoteRequestController::class, 'show']);
    });
});

Route::get('/up', function () {
    return response()->json(['status' => 'ok']);
});
