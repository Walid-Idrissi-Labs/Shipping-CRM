<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientActivity;
use Illuminate\Http\Request;

class ClientActivityController extends Controller
{
    public function index(Request $request)
    {
        $providerId = $request->user()->provider->id;

        $query = ClientActivity::where('provider_id', $providerId)
            ->where('created_at', '>=', now()->subDays(30))
            ->with('client:id,full_name,company_name,account_number')
            ->orderByDesc('created_at');

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($clientId = $request->input('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $limit = $request->input('limit', 25);

        return response()->json($query->paginate($limit));
    }
}
