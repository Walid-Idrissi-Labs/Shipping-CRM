<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\EmployeeShipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Traits\AppliesSorting;

class AdminEmployeeController extends Controller
{
    use AppliesSorting;

    public function index(Request $request)
    {
        $providerId = $request->user()->provider->id;

        // No orderBy here: applySort() below owns the ordering and would otherwise be
        // stacked behind this one, making its sort options inert.
        $query = User::where('role', 'employe')
            ->where('provider_id', $providerId);

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(name) LIKE ?', [$q])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['name', 'email', 'created_at'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate($this->perPage($request)));
    }

    /** Clamped page size so ?limit= can widen the list (e.g. filter dropdowns) safely. */
    private function perPage(Request $request): int
    {
        $limit = (int) $request->input('limit', 25);

        return $limit > 0 && $limit <= 100 ? $limit : 25;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'role' => 'employe',
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'password_hash' => Hash::make($validated['password']),
            'provider_id' => $request->user()->provider->id,
            'first_login_completed' => true,
        ]);

        return response()->json([
            'message' => 'Employe cree.',
            'employe' => $user->fresh(),
        ], 201);
    }

    public function show(Request $request, User $employe)
    {
        if ($employe->role !== 'employe' || $employe->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        return response()->json(['employe' => $employe]);
    }

    public function update(Request $request, User $employe)
    {
        if ($employe->role !== 'employe' || $employe->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', 'unique:users,email,' . $employe->id],
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
        ]);

        $employe->update(array_filter([
            'name' => $validated['name'] ?? null,
            'email' => $validated['email'] ?? null,
            'password_hash' => isset($validated['password']) ? Hash::make($validated['password']) : null,
        ]));

        return response()->json(['message' => 'Employe mis a jour.', 'employe' => $employe->fresh()]);
    }

    public function destroy(Request $request, User $employe)
    {
        if ($employe->role !== 'employe' || $employe->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $employe->delete();

        return response()->json(['message' => 'Employe supprime.']);
    }

    public function transactions(Request $request, User $employe)
    {
        if ($employe->role !== 'employe' || $employe->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $query = EmployeeShipment::where('employee_id', $employe->id)
            ->with(['shipment.client'])
            ->orderByDesc('changed_at');

        return response()->json($query->paginate($this->perPage($request)));
    }

    public function allTransactions(Request $request)
    {
        $providerId = $request->user()->provider->id;

        $query = EmployeeShipment::whereHas('shipment', fn($q) => $q->where('provider_id', $providerId))
            ->with(['employee', 'shipment.client']);

        if ($employeId = $request->input('employe_id')) {
            $query->where('employee_id', $employeId);
        }

        if ($shippingNumber = $request->input('shipping_number')) {
            $query->whereHas('shipment', fn($q) => $q->where('shipping_number', 'LIKE', "%{$shippingNumber}%"));
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('changed_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('changed_at', '<=', $dateTo);
        }

        // Ordering is applied last and never stacked on a prior sort: an earlier
        // orderBy('changed_at') would win and silently neutralise these options.
        $sortBy = $request->input('sort_by', 'time');
        switch ($sortBy) {
            case 'shipment_number':
                $query->join('shipments', 'employee_shipments.shipment_id', '=', 'shipments.id')
                    ->select('employee_shipments.*')
                    ->orderBy('shipments.shipping_number', 'asc')
                    ->orderByDesc('employee_shipments.changed_at');
                break;
            case 'employe_name':
                $query->join('users', 'employee_shipments.employee_id', '=', 'users.id')
                    ->select('employee_shipments.*')
                    ->orderBy('users.name', 'asc')
                    ->orderByDesc('employee_shipments.changed_at');
                break;
            default:
                $query->orderByDesc('changed_at');
        }

        return response()->json($query->paginate($this->perPage($request)));
    }
}